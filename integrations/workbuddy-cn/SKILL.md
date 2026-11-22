---
name: openmotion-workbuddy-cn
description: 使用技能目录内已经放好的 OpenMotion 服务、浏览器和 FFmpeg 做原生工程编辑和导出。没有本地清单或哈希不符时停止。不克隆仓库，不下载依赖。
version: 0.4.0
---

# 开源视频工程

本文件所在目录就是技能根。只使用这里的 `runtime/`。不要克隆远程仓库，不要安装依赖，不要下载浏览器、FFmpeg 或 Node，不要改系统代理、Git 或证书校验，不要索取密钥或调用付费生成。

先读 `runtime/manifest.json`。哈希不一致就停止。

## 已在打包机上跑通的部分

Linux x64 这份目录里的 `runtime/app` 是完整 OpenMotion 服务，不是单独的几何渲染器。打包机通过 MCP 调用了 `openmotion_create_project`、`openmotion_edit_project` 和 `openmotion_export_request`。服务名 `openmotion`，34 个工具。导出任务完成，技术校验 `passed`：H.264、1920×1080、30 帧、20 秒、无音轨、600 帧。浏览器是 Chromium 160.0.8178.0 快照。FFmpeg 是带 libx264 的 GPL 构建。

## 还不能交给 Windows 买家试用

- Windows 上的 Node zip、GPL FFmpeg zip 和 `modules-win32-x64` 已放进目录，但没有在 Windows 上执行。
- Windows 版 Chromium 没有打进这份目录。
- GPL 静态 FFmpeg 附有对应的 FFmpeg 源码包和构建配置。x264、x265 以及其他被静态链进去的库的源码没有全部放进包里，所以 FFmpeg 的再分发义务还没有完结。
- Chrome for Testing 的无头壳没有打进包。它的 ABOUT 写的是 Google Chrome，并指向 Chrome 条款。

`distribution-blockers.json` 的 `customerReady` 保持 `false`。不要请买家在 Windows 或 Mac 上试装。Mac Apple Silicon 没有组装。
