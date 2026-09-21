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

- `GET /healthz`：仅检查整合服务存活。
- `/api`、`/v1`、`/v1beta`、`/pg`、`/mj`、`/suno` 及子路径和 `/{mode}/mj`：转发上游，沿用原有鉴权，支持上传、SSE 和 WebSocket；连接失败返回 `502`。
- 响应清理 `X-New-Api-*`、`X-Oneapi-*` 标识头，保留其他业务头。`/api/status` 仅保留注册、API 地址和额度/货币配置，移除版本、启动时间、品牌、文档、第三方登录、通行密钥、人机验证、导航、公告等信息；禁止缓存，异常返回 `502`。其他接口响应体原样转发。
- 其余 GET/HEAD 请求使用内嵌前端：页面回退至首页，缺失静态资源返回 `404`；哈希资源长期缓存，其他资源禁止缓存。

生产环境保持 `VITE_API_URL = /`，Web 入口统一转发至 `xiaohe-server:8082`，上游仅对内网开放，`8082` 仅供入口访问。WebSocket 配置 Upgrade 转发，SSE 关闭响应缓冲。

## 更新最新提交并推送

在项目根目录执行以下命令（使用支持 `&&` 的终端，例如 PowerShell 7 或 Git Bash）：

```bash
git add . && git commit --amend --no-edit && git push --force-with-lease github wenhao666
```

该命令将全部当前变更暂存并合入最新提交，保留提交说明，再将本地 `wenhao666` 分支推送至 `github` remote。执行前请确认当前分支为 `wenhao666`、变更均需提交；`--amend` 会改写最新提交，`--force-with-lease` 在远端状态符合本地预期时允许更新历史，协作分支使用前需确认影响。
