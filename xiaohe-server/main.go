package main

import (
	"bytes"
	"embed"
	"errors"
	"io/fs"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path"
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
			// 清除客户端伪造的 Forwarded 信息，并写入当前入口信息。
			request.Out.Header.Del("Forwarded")
			request.SetURL(target)
			request.SetXForwarded()
			// 保留原始 Query，避免改变上游参数语义。
			request.Out.URL.RawQuery = request.In.URL.RawQuery
		},
		FlushInterval: -1,
		ErrorHandler: func(w http.ResponseWriter, r *http.Request, err error) {
			log.Printf("New API 代理失败: %v", err)
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			w.WriteHeader(http.StatusBadGateway)
			_, _ = w.Write([]byte(`{"success":false,"message":"New API 上游暂不可用"}`))
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
