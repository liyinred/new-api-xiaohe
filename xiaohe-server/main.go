package main

import (
	"bytes"
	"compress/gzip"
	"embed"
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path"
	"strconv"
	"strings"
	"time"
)

// frontendAssets 在编译时嵌入完整前端产物，运行时不读取外部 dist。
//
//go:embed all:dist
var frontendAssets embed.FS

// main 启动监听 8082 的整合服务；无参数、无返回值，启动失败时退出进程。
func main() {
	upstream := os.Getenv("NEW_API_BASE_URL")
	if upstream == "" {
		upstream = "http://localhost:8081"
	}
	handler, err := newHandler(upstream)
	if err != nil {
		log.Fatal(err)
	}
	server := &http.Server{
		Addr:              ":8082",
		Handler:           handler,
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       60 * time.Second,
		// 不设置整体读写超时，避免中断文件上传、SSE 和 WebSocket。
	}
	log.Print("xiaohe-server listening on :8082")
	log.Fatal(server.ListenAndServe())
}

// newHandler 创建代理与嵌入前端路由；upstream 为官方地址，返回 Handler 或配置、资源错误。
func newHandler(upstream string) (http.Handler, error) {
	target, err := url.Parse(upstream)
	if err != nil || target.Hostname() == "" || (target.Scheme != "http" && target.Scheme != "https") || target.User != nil || target.RawQuery != "" || target.Fragment != "" {
		return nil, errors.New("NEW_API_BASE_URL 必须为不含认证信息、Query 或 Fragment 的 HTTP/HTTPS 地址")
	}
	proxy := &httputil.ReverseProxy{
		Rewrite: func(request *httputil.ProxyRequest) {
			// 状态接口需要完整 JSON；禁用压缩协商与条件请求，避免绕过字段过滤。
			if request.In.URL.Path == "/api/status" {
				request.Out.Header.Set("Accept-Encoding", "identity")
				for _, name := range []string{"If-None-Match", "If-Modified-Since", "Range", "If-Range"} {
					request.Out.Header.Del(name)
				}
			}
			// 清除客户端伪造的 Forwarded 信息，并写入当前入口信息。
			request.Out.Header.Del("Forwarded")
			request.SetURL(target)
			request.SetXForwarded()
			// 保留原始 Query，避免改变上游参数语义。
			request.Out.URL.RawQuery = request.In.URL.RawQuery
		},
		FlushInterval: -1,
		// 响应路径已由 SetURL 添加上游前缀，按相同前缀定位状态接口。
		ModifyResponse: func(response *http.Response) error {
			return sanitizeProxyResponse(response, strings.TrimRight(target.Path, "/")+"/api/status")
		},
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			log.Printf("New API 代理失败: %v", err)
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			w.WriteHeader(http.StatusBadGateway)
			_, _ = w.Write([]byte(`{"success":false,"message":"上游服务暂不可用"}`))
		},
	}
	mux := http.NewServeMux()
	// 健康检查仅确认入口进程存活，不代表官方上游可用。
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json; charset=utf-8")
		_, _ = w.Write([]byte(`{"success":true}`))
	})
	// 复用官方路由命名空间，API 不得进入 SPA fallback。
	for _, prefix := range []string{"/api", "/v1", "/v1beta", "/pg", "/mj", "/suno"} {
		mux.Handle(prefix, proxy)
		mux.Handle(prefix+"/", proxy)
	}
	frontend, err := fs.Sub(frontendAssets, "dist")
	if err != nil {
		return nil, err
	}
	static, err := newStaticHandler(frontend)
	if err != nil {
		return nil, err
	}
	// 官方还支持 /{mode}/mj 路径，保持该类请求的代理行为。
	mux.Handle("/", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
		if len(parts) >= 2 && parts[1] == "mj" {
			proxy.ServeHTTP(w, r)
			return
		}
		static.ServeHTTP(w, r)
	}))
	return mux, nil
}

// newStaticHandler 托管嵌入资源并支持 SPA fallback；frontend 为资源 FS，返回 Handler 或首页读取错误。
func newStaticHandler(frontend fs.FS) (http.Handler, error) {
	index, err := fs.ReadFile(frontend, "index.html")
	if err != nil {
		return nil, errors.New("嵌入前端 index.html 不可用，请先生成 dist 再编译")
	}
	files := http.FileServerFS(frontend)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		name := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")
		info, err := fs.Stat(frontend, name)
		if err == nil && !info.IsDir() {
			setFrontendCacheHeaders(w, name)
			files.ServeHTTP(w, r)
			return
		}
		// 缺失资源返回 404，只有页面路径回退到 index.html。
		if strings.HasPrefix(name, "assets/") || name == "assets" || path.Ext(name) != "" {
			http.NotFound(w, r)
			return
		}
		setFrontendCacheHeaders(w, "index.html")
		http.ServeContent(w, r, "index.html", time.Time{}, bytes.NewReader(index))
	}), nil
}

// setFrontendCacheHeaders 按前端资源类型设置缓存策略；w 为响应写入器，name 为 dist 内相对路径，无返回值。
func setFrontendCacheHeaders(w http.ResponseWriter, name string) {
	if strings.HasPrefix(name, "assets/") {
		w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		return
	}
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Expires", "0")
}

// sanitizeProxyResponse 清理代理响应标识并过滤状态数据；response 为上游响应，statusPath 为含上游前缀的状态路径，返回处理错误。
func sanitizeProxyResponse(response *http.Response, statusPath string) error {
	for name := range response.Header {
		lower := strings.ToLower(name)
		if strings.HasPrefix(lower, "x-new-api-") || strings.HasPrefix(lower, "x-oneapi-") {
			response.Header.Del(name)
		}
	}
	if response.Request.URL.Path != statusPath {
		return nil
	}
	if response.StatusCode != http.StatusOK {
		return errors.New("状态接口返回异常状态")
	}
	defer response.Body.Close()
	var reader io.Reader = response.Body
	switch strings.ToLower(strings.TrimSpace(response.Header.Get("Content-Encoding"))) {
	case "", "identity":
	case "gzip":
		compressed, err := gzip.NewReader(response.Body)
		if err != nil {
			return err
		}
		defer compressed.Close()
		reader = compressed
	default:
		return errors.New("状态接口返回不支持的压缩格式")
	}
	// 限制解压后的大小，异常响应不回退为透传。
	const maxStatusSize = 2 << 20
	body, err := io.ReadAll(io.LimitReader(reader, maxStatusSize+1))
	if err != nil {
		return err
	}
	if len(body) > maxStatusSize {
		return errors.New("状态接口响应过大")
	}
	filtered, err := filterSystemStatus(body)
	if err != nil {
		return err
	}
	response.Body = io.NopCloser(bytes.NewReader(filtered))
	response.ContentLength = int64(len(filtered))
	response.Header.Set("Content-Length", strconv.Itoa(len(filtered)))
	response.Header.Set("Content-Type", "application/json; charset=utf-8")
	response.Header.Set("Cache-Control", "no-store")
	for _, name := range []string{"Content-Encoding", "ETag", "Last-Modified", "Content-MD5", "Digest", "Content-Range", "Accept-Ranges", "Trailer"} {
		response.Header.Del(name)
	}
	response.Trailer = nil
	return nil
}

// filterSystemStatus 按定制前端 SystemStatus 契约过滤数据；body 为上游 JSON，返回白名单 JSON 或解析错误。
func filterSystemStatus(body []byte) ([]byte, error) {
	var upstream struct {
		Success bool                       `json:"success"`
		Data    map[string]json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(body, &upstream); err != nil {
		return nil, err
	}
	if !upstream.Success || upstream.Data == nil {
		return nil, errors.New("状态接口业务响应异常")
	}
	data := make(map[string]json.RawMessage)
	for _, name := range []string{
		"register_enabled", "password_register_enabled", "email_verification",
		"server_address", "quota_per_unit", "quota_display_type", "usd_exchange_rate",
		"custom_currency_symbol", "custom_currency_exchange_rate", "price",
	} {
		if value, exists := upstream.Data[name]; exists {
			data[name] = value
		}
	}
	if value, exists := upstream.Data["api_info"]; exists {
		var endpoints []struct {
			URL string `json:"url"`
		}
		if err := json.Unmarshal(value, &endpoints); err != nil {
			return nil, err
		}
		encoded, err := json.Marshal(endpoints)
		if err != nil {
			return nil, err
		}
		data["api_info"] = encoded
	}
	return json.Marshal(map[string]any{"success": true, "message": "", "data": data})
}
