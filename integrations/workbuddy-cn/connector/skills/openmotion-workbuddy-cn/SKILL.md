---
name: openmotion-workbuddy-cn
description: 在买家自己的 OpenMotion 源码检出上检查依赖、确认后安装或复用锁定运行时、合并本机 WorkBuddy MCP、创建原生 Hyperframes 工程并渲染 MP4。不调用付费模型，也不假装技能包里带有完整软件。
version: 0.2.0
---

# 开源视频工程

这个 Skill 只描述本仓库已经存在的接口。调用前先看 `tools/list`。列表里没有的名字不要编，也不要调用。

当前检出的 phase1 工具里，和这条链路直接相关的是：

| 工具 | 用途 |
| --- | --- |
| `openmotion_create_project` | 创建可编辑原生工程。它不会直接生成成片。 |
| `openmotion_get_project` | 读取工程、revision、文件清单。 |
| `openmotion_edit_project` | 保存原生 HTML。需要当前 revision 和 version。 |
| `openmotion_export_request` | 由服务端排队渲染 MP4。完成后用 `openmotion_get_project` 的 `exportJobId` 读取。 |
| `openmotion_export_cancel` | 取消尚未完成的导出。 |

`openmotion_media_use`、`openmotion_generate_asset` 以及任何需要模型密钥的工具都不属于这条无旁白几何样片。不要索取密钥，也不要发起付费生成。

## 买家机器上的命令

在 OpenMotion 检出根目录执行。Node 需满足 `package.json` 的 `engines`（`>=22.18.0`）。文档和 CI 推荐的是 26.11.1；实测版本不同就如实写出，不要改成推荐版本。

```sh
node integrations/workbuddy-cn/scripts/detect.mjs --json
node integrations/workbuddy-cn/scripts/prepare-runtime.mjs
node --experimental-strip-types integrations/workbuddy-cn/scripts/prepare-runtime.mjs --confirm
node integrations/workbuddy-cn/scripts/connect-mcp.mjs --config-dir "$WORKBUDDY_CONFIG_DIR" --data-dir "$MOTION_DATA_DIR"
node integrations/workbuddy-cn/scripts/connect-mcp.mjs --config-dir "$WORKBUDDY_CONFIG_DIR" --data-dir "$MOTION_DATA_DIR" --confirm
node --experimental-strip-types integrations/workbuddy-cn/scripts/create-project.mjs --out "$MOTION_DATA_DIR/fold-clock" --force
node --experimental-strip-types integrations/workbuddy-cn/scripts/render-project.mjs --project "$MOTION_DATA_DIR/fold-clock" --output "$MOTION_DATA_DIR/fold-clock.mp4" --log "$MOTION_DATA_DIR/render.log"
node --experimental-strip-types integrations/workbuddy-cn/scripts/smoke.mjs --confirm-runtime
```

没有 `--confirm` 或 `--confirm-runtime` 时，脚本不得安装依赖，也不得写 `mcp.json`。

`prepare-runtime.mjs` 只在检出目录执行 `npm ci --no-audit --no-fund`。它复用已经符合 `package-lock.json` 的 `node_modules`。Hyperframes 0.9.7 与 GSAP 3.15.0 的下载地址和 integrity 写在 `runtime-pin.json`。Skill 不包含 Node、Chrome、FFmpeg 或渲染器。

`connect-mcp.mjs` 只合并 `mcpServers.openmotion`。已有的其他服务保留。不属于本技能的 `openmotion` 条目会拒绝写入。配置目录和工程目录都必须在检出之外，并且彼此分开。环境变量只放数据目录和遥测关闭开关，不放密钥。

渲染命令与 `server.ts` 的导出相同：`hyperframes render . --output <file> --format mp4 --json`。失败时停住，不要改用独立 FFmpeg 字幕幻灯片冒充引擎输出。FFmpeg 只作为 Hyperframes 自己的编码，以及事后的 ffprobe / 抽帧。

## 样片

`sample/` 是 20 秒、1920×1080、30fps 的无旁白几何片，文案是原创中文。创建工程时才会把锁定的 `gsap.min.js` 复制进去。字体使用机器上已经安装的字体，不打包字体文件。

## 还不能声称已经完成的事

WorkBuddy 桌面导入、在 WorkBuddy 里激活 MCP、Mac Apple Silicon 实机渲染，都还是 not_run。生成的本机 `mcp.json` 含有买家机器路径，不能放进公开压缩包。
