# Changelog

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
