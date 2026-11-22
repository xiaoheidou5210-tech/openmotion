# OpenMotion WorkBuddy 中文技能包 · Linux 烟雾测试

日期：2026-11-22。技能版本：0.2.0。平台：Linux x64 云虚拟机。

这不是 Mac，也不是 WorkBuddy 桌面。下面的通过只覆盖这条虚拟机上的引擎渲染。

## 版本

- Node 实测：v22.23.4
- `package.json` engines：`>=22.18.0`（实测满足）
- 文档与 CI 推荐：26.11.1（实测不是这个版本）
- npm 实测：10.9.9
- Hyperframes：0.9.7，Apache-2.0。integrity 在 `runtime-pin.json`，由 `npm ci` 对照 `package-lock.json` 校验
- GSAP：3.15.0，Standard "no charge" license。创建工程时从 `node_modules/gsap/dist/gsap.min.js` 复制
- 浏览器：本机已安装的 Google Chrome 157.0.8103.50。设置了 `HYPERFRAMES_BROWSER_PATH`，没有下载 Hyperframes 管理的 chrome-headless-shell 152.0.7977.30
- FFmpeg / ffprobe：6.1.1（发行版已安装）。编码由 Hyperframes 调用，校验再调用 ffprobe

技能包不包含 Node、Chrome、FFmpeg、Hyperframes 或 GSAP。

## 实际跑过的链路

1. `node integrations/workbuddy-cn/scripts/detect.mjs`：渲染前置就绪。
2. 检出目录已执行 `npm ci --no-audit --no-fund`。随后 `prepare-runtime` 复用现有 `node_modules`（`action=reuse`，`applied=false`）。
3. `create-project` 写入原生工程：`index.html` 加四段 `compositions/*.html`，`hyperframes.json`，以及复制来的 GSAP。
4. `scripts/lint-project.mjs` 经 `inspectProject(..., "lint")`：0 error。
5. 渲染参数与 `server.ts` 相同：`node <checkout>/node_modules/hyperframes/bin/hyperframes.mjs render . --output <mp4> --format mp4 --json`。退出码 0，文件头为 `ftyp`。没有使用独立字幕幻灯片。
6. `scripts/verify-export.ts` 期望 `{width:1920,height:1080,fps:30,duration:20,audio:"silent"}`：passed。
7. MCP：`node --experimental-strip-types mcp.ts` 的 stdio `initialize` 与 `tools/list`。服务名 `openmotion`，版本 `0.0.1`，34 个工具，包含 `openmotion_create_project`、`openmotion_get_project`、`openmotion_edit_project`、`openmotion_export_request`。
8. `node --test integrations/workbuddy-cn/scripts/connect-mcp.test.mjs`：6 项通过。覆盖未确认不写文件、合并时保留其他服务、拒绝不属于本技能的 `openmotion`、拒绝损坏的 JSON、拒绝凭据和位于检出内部的目录。

重复命令：

```sh
node --experimental-strip-types integrations/workbuddy-cn/scripts/smoke.mjs --confirm-runtime
```

没有 `--confirm-runtime` 时，缺少依赖会停住，不会安装，也不会改 WorkBuddy 配置。

## 成片

- 文件：本次运行生成的 `fold-clock-zh.mp4`（不放进技能 ZIP，也不提交进 Git）
- SHA-256：`6b0b33c1224709be51bbcc8a425fbca737f81d8d59ac7df850191bc31c9e5fa2`
- 大小：433098 字节
- h264，yuv420p，1920x1080
- 帧率 30/1，平均 30/1
- 容器与视频流时长都是 20.000000 秒
- 解码 600 帧；seek 0s、10s、19.966667s 通过
- 音频流 0。文案是无旁白
- 抽帧 2s、7s、12s、17s：中文可读，圆、方、三线和落幅几何都在，底部进度条随时间变长

渲染日志有一条 non-blocking 的 404，没有阻断出片。画面检查没有发现缺字。

ffprobe：

```sh
ffprobe -v error -show_streams -show_format -of json fold-clock-zh.mp4
```

## 未运行

- WorkBuddy 桌面导入 Connector：not_run
- WorkBuddy 里激活 MCP：not_run
- Mac Apple Silicon 安装、渲染、播放：not_run
- 真人在播放器里从头播到尾：not_run。技术校验和四帧抽查不能代替它
- 付费模型与媒体供应商：未调用，没有索取密钥
- 市场上架、Release、收费、合并、向上游提交：未做

## 公开包里不会有的东西

本机 `mcp.json` 含有 Node 绝对路径、检出路径和工程目录。它只在 `--confirm` 之后写到买家指定的配置目录。ZIP 里只有 `connector/mcp.template.json` 占位符。
