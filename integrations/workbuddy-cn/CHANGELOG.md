# Changelog

## 0.3.0

Distribution gate. This is not a customer installer.

- Root `SKILL.md` is the WorkBuddy entry. It does not tell a buyer to clone, run npm, or download a browser.
- `distribution-blockers.json` keeps `customerReady` false.
- Recorded assemblies: Linux and Windows Hyperframes/GSAP `node_modules` trees, and a hash-checked Node.js 22.22.2 Windows zip. None of those are inside the skill, and the Windows files were not executed.
- Chrome for Testing `chrome-headless-shell` is not bundled. Its catalog repository license does not grant redistribution of the binary, and a buyer download is not accepted as mainland onboarding.
- FFmpeg is not bundled. OpenMotion's phase1 MCP server is not inside the Hyperframes/GSAP trees.

## 0.2.0

Executable local skill package for this fork.

- Dependency detection reports the running Node version separately from `package.json` engines `>=22.18.0` and the docs/CI Node 26.11.1.
- `prepare-runtime.mjs` reuses a matching `node_modules` or, only with `--confirm`, runs `npm ci` in the checkout. Hyperframes 0.9.7 and GSAP 3.15.0 stay external, with registry URL and integrity in `runtime-pin.json`.
- `connect-mcp.mjs` writes a local WorkBuddy `mcp.json` only with `--confirm`. It merges `mcpServers.openmotion`, keeps other servers, and refuses a foreign `openmotion` entry or a malformed file.
- `create-project.mjs` writes a native Hyperframes project. `render-project.mjs` calls the same `hyperframes render . --output --format mp4 --json` path as `server.ts`.
- `probe-mcp.mjs` performs a real stdio `initialize` and `tools/list` against `mcp.ts`.
- The 20 second sample is original Chinese copy plus geometry. It does not bundle fonts, Node, Chrome, FFmpeg, or the renderer.

0.1.0 was a document-only bundle and is not this package.

WorkBuddy desktop import, WorkBuddy MCP activation, and Mac Apple Silicon execution are not claimed here.
