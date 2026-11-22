# 开源视频工程（WorkBuddy 本地技能包 0.2.0）

这是当前 fork 里的本地技能包，用来在**已经检出的 OpenMotion 源码**上完成：检查依赖、确认后安装或复用锁定依赖、合并 WorkBuddy 的 MCP 配置、创建原生 Hyperframes 工程、用仓库同一条渲染命令导出 MP4。

它不是 OpenMotion 或 WorkBuddy 的官方发行，也不是一份独立引擎。Node、Chrome、FFmpeg、Hyperframes 和 GSAP 都不在技能包里。Hyperframes 0.9.7 与 GSAP 3.15.0 的下载地址和 integrity 写在 `runtime-pin.json`，由 `npm ci` 对照 `package-lock.json` 校验。

## 买家要执行的脚本

在检出根目录：

```sh
node integrations/workbuddy-cn/scripts/detect.mjs --json
node integrations/workbuddy-cn/scripts/prepare-runtime.mjs
node --experimental-strip-types integrations/workbuddy-cn/scripts/prepare-runtime.mjs --confirm
node integrations/workbuddy-cn/scripts/connect-mcp.mjs --config-dir /绝对路径/workbuddy配置 --data-dir /绝对路径/工程数据
node integrations/workbuddy-cn/scripts/connect-mcp.mjs --config-dir /绝对路径/workbuddy配置 --data-dir /绝对路径/工程数据 --confirm
node --experimental-strip-types integrations/workbuddy-cn/scripts/smoke.mjs --confirm-runtime
```

不带 `--confirm` 或 `--confirm-runtime` 时，不会安装依赖，也不会改 `mcp.json`。配置目录和工程目录必须在检出之外，并且不能是同一个目录。已有的其他 MCP 服务会保留。别人已经写过的 `openmotion` 条目会被拒绝，文件保持原样。

`connector/mcp.template.json` 里的 `NODE_BINARY`、`CHECKOUT`、`DATA_DIRECTORY` 是占位符，不能直接导入。本机文件由 `connect-mcp.mjs --confirm` 生成，生成结果含有本机路径，不要放进公开压缩包。

渲染使用 `server.ts` 同一组参数：`render . --output <mp4> --format mp4 --json`。失败就停止。不要另做一套 FFmpeg 字幕幻灯片当作 OpenMotion 成片。

## 还没有在本机做过的事

- WorkBuddy 桌面导入 Connector：not_run
- WorkBuddy 内激活 MCP：not_run
- Mac Apple Silicon 安装与出片：not_run

Node 以 `package.json` 的 `>=22.18.0` 为最低要求。仓库文档和 CI 使用 26.11.1。检测脚本会同时打印实测版本和推荐版本。

许可证见仓库 `LICENSE`、`NOTICE` 和 `THIRD_PARTY_NOTICES.md`。不要把这份改动说成官方发布，也不要把它重新许可成另一份专有条款。
