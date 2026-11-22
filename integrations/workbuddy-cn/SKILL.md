---
name: openmotion-workbuddy-cn
description: 判断当前技能目录是否已经带齐 OpenMotion MCP 编辑导出、Node、FFmpeg 和可再分发浏览器。未带齐时停止，不克隆仓库，不让买家安装系统软件，也不访问外网下载。
version: 0.3.0
---

# 开源视频工程

这个文件在技能目录根上。WorkBuddy 只复制所选技能目录时，以本文件所在目录为根，不要到目录外面找仓库。

`distribution-blockers.json` 的 `customerReady` 现在是 `false`。不要把本包交给买家当安装完成，也不要开始出片。

## 停止时要说明的缺口

- 浏览器没有打进技能目录。Hyperframes 固定的无头壳来自 Chrome for Testing。目录仓库的 Apache-2.0 不覆盖那个二进制，不能再分发。让买家自行下载浏览器不能当作国内安装路径。
- FFmpeg 和 ffprobe 没有打进技能目录。可以再分发的构建必须带上许可证和对应源码，这里没有。
- Node.js Windows x64 v22.22.2 的官方 zip 已在打包机上核对 SHA-256，但没有放进技能目录，也没有运行 `node.exe`。
- OpenMotion 的 phase1 编辑和导出不在已组装的 Hyperframes/GSAP 目录里。`tools/call` 会启动 `server.ts`，再请求 `/motion-api/phase1/call`。只有 CLI 渲染几何 HTML 不能代替 `openmotion_create_project`、`openmotion_edit_project` 和 `openmotion_export_request`。
- 没有 Windows 执行环境，也没有 Mac Apple Silicon 组装或运行记录。

## 代理不要做的事

不要克隆远程仓库。不要改系统代理、Git 或证书校验。不要在买家机器上安装依赖。不要下载浏览器、FFmpeg 或 Node。不要索取模型密钥，也不要调用付费生成。

买家已经同意也不能用一次外网下载补上这些缺口。缺口消失的条件是技能目录里同时有可再分发的浏览器、FFmpeg、Node、以及能完成原生工程编辑和导出的 OpenMotion 服务，并且清单把 `customerReady` 改为 `true`。

## 已验证过、但不能当成买家安装

在完整检出里，Linux 曾经用检出中的 Hyperframes 0.9.7 渲染过 20 秒样片，并用 MCP `tools/list` 看到上述导出工具。那是 Linux 检出测试，不是 Windows，不是 Mac，也不是这份可分发安装包。
