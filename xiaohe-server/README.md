# xiaohe-server

独立的 Go 整合入口，固定监听 `8082`，复用标准库 `net/http/httputil.ReverseProxy` 转发到官方 New API，不依赖官方 Go 模块、不直接访问数据库。

## 启动

在 `web-xiaohe` 中执行 `pnpm build`，成功后构建钩子会先删除 `xiaohe-server/dist`，再将新 `web-xiaohe/dist` 移动到该目录（源 dist 不再保留）。构建失败不会执行迁移；删除前校验新产物包含 `index.html`。

先启动官方 New API（本地现有上游端口为 `8081`），再在本目录运行：

```powershell
$env:NEW_API_BASE_URL = 'http://localhost:8081'
go run .
```

`NEW_API_BASE_URL` 可省略，默认 `http://localhost:8081`。读取进程环境变量，不自动加载 `.env`。上游地址仅由服务配置决定，不能由客户端指定；支持 HTTP/HTTPS，可包含路径前缀。前端通过 Go `embed` 编译进程序，只使用嵌入资源，不读取运行目录中的外部 `dist`。`go run .` 前必须已有前端产物；编译后的程序可在任意工作目录运行。

开发请求链路：`浏览器 → web-xiaohe Vite /api 代理 → localhost:8082 → localhost:8081`。前端继续复用现有 Axios 实例和相对路径，无需新增请求封装。此修改不会启动 Vue3 服务或执行 build。

## Windows 交叉编译 Linux amd64

安装 Go 1.25.1 或更高版本，先在 `web-xiaohe` 执行 `pnpm build` 生成并迁移最新前端产物，再在 Windows PowerShell 中进入 `xiaohe-server` 目录执行以下一行命令（先检查首页产物，再编译并自动嵌入 dist）：

```powershell
if (!(Test-Path './dist/index.html' -PathType Leaf)) { throw '请先在 web-xiaohe 执行 pnpm build' }; $env:GOOS = 'linux'; $env:GOARCH = 'amd64'; $env:CGO_ENABLED = '0'; go build -o xiaohe-server-linux-amd64 .
```

生成的 `xiaohe-server-linux-amd64` 为 Linux x86-64 可执行文件，不能直接在 Windows 中运行。以上环境变量仅影响当前 PowerShell 会话，后续本机开发建议使用新的 PowerShell 会话。

只需将该文件上传至 Linux 服务器，无需上传 `dist`，再执行：

```bash
chmod +x ./xiaohe-server-linux-amd64
./xiaohe-server-linux-amd64
```

默认连接本机 `8081` 上游；官方上游地址不同时，使用 `NEW_API_BASE_URL=http://实际内网地址:端口 ./xiaohe-server-linux-amd64`。服务仍监听 `8082`。前端更新后必须重新生成 dist、编译并部署新应用；替换运行目录的外部 dist 不会生效。编译时缺失 dist 会由 Go `embed` 报错，不提供占位页面或外部文件兜底。

## 路由与部署

- `GET /healthz`：本地存活检查，不检查上游。
- `/api`、`/v1`、`/v1beta`、`/pg`、`/mj`、`/suno` 及子路径，以及 `/{mode}/mj` 路径：代理给官方 New API，支持管理 API、模型 API、上传、SSE 和 WebSocket；保留 Method、Path、Query、Body、Authorization 和 Cookie，不增加业务层重试。
- 其余 GET/HEAD 路径：托管二进制内嵌的前端文件，页面路由回退至 `index.html`；HTML 与非哈希资源禁止缓存，`assets/` 下的内容哈希资源长期缓存；缺失静态资源返回 `404`，不回退 HTML。
- 连接复用、连接及 TLS 超时使用 Go 默认 Transport；不设置整体读写超时，以兼容长连接。连接失败返回统一 JSON `502`，内部错误只记录在服务日志。

生产环境 `web-xiaohe/.env.production` 保持 `VITE_API_URL = /`。访问 `http://localhost:8082` 即可使用定制前端，页面和 API 同源。生产 Web 入口可将所有请求统一转发到 `xiaohe-server:8082`，不能再指向官方 New API。WebSocket 需配置入口的 Upgrade Header，SSE 需关闭入口响应缓冲。

本服务未实现定制业务接口；后续定制 Handler 应在静态页面 fallback 前注册。

官方 New API 应只对内网开放；生产环境应通过 Web 入口限制 `8082` 的公网访问。代理不新增认证或 CORS 放行规则，继续由官方接口执行原有鉴权；同源部署保证现有 Cookie 登录流程。

## 更新最新提交并推送

在项目根目录执行以下命令（使用支持 `&&` 的终端，例如 PowerShell 7 或 Git Bash）：

```bash
git add . && git commit --amend --no-edit && git push --force-with-lease github wenhao666
```

该命令将全部当前变更暂存并合入最新提交，保留提交说明，再将本地 `wenhao666` 分支推送至 `github` remote。执行前请确认当前分支为 `wenhao666`、变更均需提交；`--amend` 会改写最新提交，`--force-with-lease` 在远端状态符合本地预期时允许更新历史，协作分支使用前需确认影响。
