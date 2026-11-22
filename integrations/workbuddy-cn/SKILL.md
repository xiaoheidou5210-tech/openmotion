---
name: openmotion-workbuddy-cn
description: 使用技能目录内已经放好的 OpenMotion 服务、浏览器和 FFmpeg 做原生工程编辑和导出。没有本地清单或哈希不符时停止。不克隆仓库，不下载依赖。
version: 0.4.2
---

# 开源视频工程

本文件所在目录就是技能根。只使用这里的 `runtime/`。不要克隆远程仓库，不要安装依赖，不要下载浏览器、FFmpeg 或 Node，不要改系统代理、Git 或证书校验，不要索取密钥或调用付费生成。

先读 `runtime/manifest.json`。哈希不一致就停止。

同意之后，由代理启动 `node scripts/boot.mjs --consent`。它只使用本目录里的服务、浏览器和编码器，不写系统配置。Windows 上若存在 `runtime/node/win32-x64/node.exe`，由它接管进程。配置合并仍走 `scripts/connect-mcp.mjs`，没有 `--confirm` 时不改已有配置。

## 已在打包机上跑通的部分

Linux x64 的 `runtime/app` 是完整 OpenMotion 服务。打包机通过 MCP 调用了 `openmotion_create_project`、`openmotion_edit_project` 和 `openmotion_export_request`。服务名 `openmotion`，34 个工具。用自编译的 FFmpeg 7.1.1 加 x264 再次导出，技术校验 `passed`：H.264、1920×1080、30 帧、20 秒、无音轨。浏览器是 Chromium 快照，许可文本来自该快照 REVISIONS 记录的源码提交，放在 `runtime/legal`。

## 还不能交给买家试用

- Windows 的 Chromium、已展开的 Node 程序、FFmpeg 程序和服务依赖已按平台放进对应归档，但没有在 Windows 上执行。编译出的程序不是运行验证。
- Mac Apple Silicon 没有组装。
- Chromium 的第三方致谢页已按两个快照提交生成。Windows 和 Mac 仍然没有执行。

`distribution-blockers.json` 的 `customerReady` 保持 `false`。不要请买家试装。
