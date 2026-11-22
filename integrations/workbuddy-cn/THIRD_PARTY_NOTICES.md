# Third-party notices

`customerReady` is false because Windows and Mac were not executed. The Linux package uses these notices.

The encoder in the built tree is FFmpeg 7.1.1 plus x264 0.165.x only. FFmpeg is GPL when built with `--enable-gpl`. x264 COPYING is GPL-2. Both source archives and the build commands ship in `runtime/legal/encoder-source`. The Linux executable links only libc and libm. The Windows executable imports only Windows system DLLs and was not run.

Chromium snapshots Linux_x64/1751533 (`got_revision` 3f85d96407489c384105d07da684f47ce3cc4222) and Win_x64/1751520 (`got_revision` b17d8aae454e27eba416d89c37e0c25c889a75dc) do not contain a LICENSE file. The LICENSE text was read from those commits and stored in `runtime/legal`. `chrome-wrapper` names Chromium and a BSD-style license. The generated about_credits page is not in the snapshot and was not rebuilt. Chrome for Testing's headless shell is not included; its ABOUT file says Google Chrome.

Node.js v22.22.2 Windows zip matches the official SHA-256 and contains its own LICENSE. It was not executed.

| Piece | Version inspected | License finding | In the skill directory |
| --- | --- | --- | --- |
| OpenMotion / Studio | repository 0.0.1, Studio 0.9.7 | Apache-2.0. Notices stay in `LICENSE` and `studio/LICENSE`. Phase1 export is `server.ts`. | Source remains in the checkout. Not copied into a buyer runtime. |
| Hyperframes | 0.9.7 | Apache-2.0 | Temporary assembly only |
| GSAP | 3.15.0 | Standard no-charge license, https://gsap.com/standard-license (effective 2025-04-30). Reproduce and implement for permitted uses. Do not remove notices. Do not use it to build a no-code animation product that competes with Webflow. | Temporary assembly only |
| esbuild | 0.28.2 | MIT | Inside the temporary assembly |
| puppeteer-core / @puppeteer/browsers | 25.18.1 / 3.2.7 | Apache-2.0 for the downloader. That is not a license for the Chrome binary. | Downloader would ride with Hyperframes. Browser binary not included. |
| chrome-headless-shell | 152.0.7977.30 pinned by Hyperframes | No redistribution grant established | Not included |
| Chromium snapshot chrome-linux.zip | revision 1751533, 260676636 bytes observed by HTTP HEAD | Body not downloaded. License file inside the zip was not read. | Not included |
| sharp / sharp-libvips | 0.35.5 / 1.3.4 | sharp package metadata says Apache-2.0. `@img/sharp-libvips-linux-x64` is LGPL-3.0-or-later. | Temporary Linux assembly only |
| FFmpeg | system 6.1.1 used by the earlier Linux checkout render | Not vendored. GPL/LGPL redistribution needs the matching license and source. | Not included |
| Node.js | 22.22.2 Windows x64 zip | Core license grants redistribution when the notice is kept. SHA-256 `7c93e9d92bf68c07182b471aa187e35ee6cd08ef0f24ab060dfff605fcc1c57c` matched `SHASUMS256.txt`. | Zip verified outside the skill. Not included. `node.exe` not run. |

Docs/CI Node remains 26.11.1. The checkout smoke used v22.23.4. The Windows zip that was hashed is v22.22.2. None of these is a Mac result.

This skill package does not ship those projects. Versions below are the ones this checkout locks. `npm ci` checks the integrity values in `runtime-pin.json` against `package-lock.json`.

| Piece | Version | License | Role |
| --- | --- | --- | --- |
| OpenMotion (this repository) | 0.0.1 | Apache-2.0 | Application, MCP server, project and export services |
| Hyperframes | 0.9.7 | Apache-2.0 | Native composition format and MP4 renderer |
| Hyperframes Studio sources under `studio/` | 0.9.7 | Apache-2.0 | Editor. Not modified by this package |
| GSAP | 3.15.0 | Standard "no charge" license, https://gsap.com/standard-license | Copied into a created project from `node_modules/gsap/dist/gsap.min.js` |
| FFmpeg / ffprobe | whatever the buyer already installed | the buyer's installed build | Used by Hyperframes to encode, then by the smoke script to probe and extract frames |
| Chrome or Chromium | the local browser | the browser's own license | Used by Hyperframes to capture frames |

No font file is packaged. The sample CSS names WenQuanYi Micro Hei, PingFang SC, Hiragino Sans GB, Noto Sans CJK SC, Microsoft YaHei, and Droid Sans Fallback. Those faces stay on the machine that already has them. WenQuanYi Micro Hei is not relicensed and is not copied into the zip.

The sample film is original Chinese wording and CSS geometry made for this package. It is not a Hyperframes catalog template and not an official OpenMotion or WorkBuddy release.
