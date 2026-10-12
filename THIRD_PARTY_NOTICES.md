# Third-party provenance

Selected code was extracted from local references on 2026-10-12.

- `src/capture/BarrageGrab`: ape-byte/DouyinBarrageGrab commit c9343da287cf77ce637c11e32333b2a511cd62e9, MIT. License retained at `src/capture/LICENSE.DouyinBarrageGrab`. Mature proxy, HTTP/WSS, protobuf models and gzip implementation retained. First-party changes remove automatic system-proxy/certificate/installation mutation, add RAW ACK IPC, replace entry point and bind loopback. Original Program/Forms remain compiled dependencies, are not the entry point, and are not invoked.
- `src/parser/{parser,decode,wire}.js`: Yellowii/douyinprotobuf commit e9e6cec4a2076dc5aacf94a0ca85ede33274544c, copied without rewriting. The supplied reference has no top-level LICENSE file; no license grant is invented here. Clarify redistribution rights before publishing these reference-derived files.
- `src/parser/vendor`: original official Douyin protocol resources; provenance URLs and SHA-256 retained in vendor/provenance.json. They are not LiveWorkbench-original/MIT assets.
- NuGet/npm dependency notices remain with their packages. Dependencies/binaries are local ignored build artifacts, not third-party repository imports.

`references/` remains untouched and ignored. Extraction manifest records parser source hashes. The reference-derived parser/decode/wire files and vendor resources are excluded from the public repository while redistribution rights remain unresolved. `npm run setup:parser -- --fetch` prepares the pinned upstream files locally and verifies every hash; `--source <protobuf-live directory>` uses an explicit local source instead. This does not grant redistribution rights.

WebSource uses the same pinned upstream commit's `src/live.js` (SHA256 d72a2440bc6b07ab6586e199a54917d109f30b826fc3f2268771a7342f87d865). It is also excluded from publication. `setup:websource` verifies that source and prepares an independently versioned local RAW-await adaptation; the upstream WebcastParser is unchanged. The adaptation preserves target validation, heartbeat, ACK and bounded reconnect behavior. douyin-live-monitor was consulted for separating webpage short IDs from actual room IDs; its polling/notification/credential/room-list code is not imported or executed.
