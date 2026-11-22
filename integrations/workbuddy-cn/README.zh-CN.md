# 开源视频工程（0.3.0，还不是买家安装包）

根上的 `SKILL.md` 是 WorkBuddy 应加载的入口。`distribution-blockers.json` 里 `customerReady` 为 `false`。不要把这个目录交给买家当作已经能安装、编辑和导出。

买家首次运行不能依赖 Git 检出、npm 安装，也不能临时下载 Node、FFmpeg 或浏览器。这些组件要么已经在技能目录里并带有许可证，要么就停下来。用 Google 存储代替 GitHub 不能算国内安装已经打通。

0.2.0 的检出脚本还留在 `scripts/`，只给已经拥有完整检出的 Linux 测试使用。那次 20 秒样片和 MCP 工具列表不能写成 Windows 或 Mac 通过，也不能写成这份目录已经自包含。

phase1 的 `openmotion_create_project`、`openmotion_edit_project` 和 `openmotion_export_request` 仍是原生编辑导出接口。只渲染一段几何 HTML 不能代替它们。

许可证见 `NOTICE`、`THIRD_PARTY_NOTICES.md` 和 `distribution-blockers.json`。
