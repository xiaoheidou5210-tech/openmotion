# Third-party notices

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
