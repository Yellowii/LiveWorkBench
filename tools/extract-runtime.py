"""One-time selected source extraction. Never writes references or user data."""
from pathlib import Path
import shutil, re, json, hashlib
root=Path(__file__).resolve().parent.parent
if (root/'src/capture/BarrageGrab/CaptureHost.cs').exists() or (root/'src/runtime.js').exists():
    raise SystemExit('One-time extraction refused: existing first-party adaptations must not be overwritten. Maintain src directly.')
ref=root/'references'
parser=root/'src/parser'
parser.mkdir(parents=True,exist_ok=True)
manifest=[]
for name in ['parser.js','decode.js','wire.js']:
    source=ref/'douyinprotobuf/protobuf-live/src'/name
    target=parser/name
    shutil.copy2(source,target)
    manifest.append({'source':str(source.relative_to(root)),'target':str(target.relative_to(root)),'sha256':hashlib.sha256(source.read_bytes()).hexdigest()})
for source in (ref/'douyinprotobuf/protobuf-live/src/vendor').iterdir():
    if source.is_file():
        target=parser/'vendor'/source.name;target.parent.mkdir(exist_ok=True);shutil.copy2(source,target)
        manifest.append({'source':str(source.relative_to(root)),'target':str(target.relative_to(root)),'sha256':hashlib.sha256(source.read_bytes()).hexdigest()})

source_root=ref/'DouyinBarrageGrab/BarrageGrab'
target_root=root/'src/capture/BarrageGrab'
# Copy source/resources only, not git, packages, outputs, samples or binaries.
for source in source_root.rglob('*'):
    rel=source.relative_to(source_root)
    if source.is_file() and not any(p in ['bin','obj','.git'] for p in rel.parts) and source.suffix.lower() in ['.cs','.csproj','.resx','.config','.xml','.png','.jpg','.ico','.js','.json','.manifest']:
        target=target_root/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
shutil.copy2(ref/'DouyinBarrageGrab/LICENSE',root/'src/capture/LICENSE.DouyinBarrageGrab')

p=target_root/'Proxy/TitaniumProxy.cs';text=p.read_text(encoding='utf-8-sig')
text=text.replace('proxyServer = new ProxyServer();','proxyServer = new ProxyServer(false, false, false);')
a=text.index('            proxyServer.CertificateManager.CertificateValidDays')
b=text.index('            //https://github.com',a)
text=text[:a]+'''            // LiveWorkbench: external managed certificate only; NEVER install/trust.
            proxyServer.CertificateManager.SaveFakeCertificates = false;
            if (!string.IsNullOrWhiteSpace(LiveWorkbench.CaptureHost.CertificatePath))
                proxyServer.CertificateManager.RootCertificate = new X509Certificate2(
                    LiveWorkbench.CaptureHost.CertificatePath,
                    LiveWorkbench.CaptureHost.CertificatePassword);

'''+text[b:]
text=text.replace('new ExplicitProxyEndPoint(IPAddress.Any, ProxyPort, true)','new ExplicitProxyEndPoint(IPAddress.Loopback, LiveWorkbench.CaptureHost.Port, !string.IsNullOrEmpty(LiveWorkbench.CaptureHost.CertificatePath))')
a=text.index('            //处理直播伴侣开播更新');b=text.index('\n        // Hook 直播伴侣开播信息',a)
text=text[:a]+'''            // Reuse proxy capture; record selected HTTP before any JSON/Protobuf parse.
            if (processName != "直播伴侣" && !LiveWorkbench.CaptureHost.SmokeMode) return;
            if (urixPathIsLifecycle(e) || uri.Contains(BARRAGE_POOL_PATH)) {
                var bytes = await e.GetResponseBody();
                var format = uri.Contains(BARRAGE_POOL_PATH) ? "response" : "http-json";
                await LiveWorkbench.CaptureHost.RecordAsync(bytes, format, processName,
                    e.HttpClient.Request.RequestUri.AbsolutePath, e.HttpClient.Response.StatusCode);
            }
            if (e.HttpClient.ConnectRequest?.TunnelType == TunnelType.Websocket &&
                (webcastBarrageReg.IsMatch(uri) || processName == "直播伴侣" || LiveWorkbench.CaptureHost.SmokeMode)) {
                e.DataReceived += WebSocket_DataReceived;
            }
        }
        private bool urixPathIsLifecycle(SessionEventArgs e) {
            var path = e.HttpClient.Request.RequestUri.AbsolutePath.TrimEnd('/');
            return path.EndsWith("/webcast/room/create") || path.EndsWith("/webcast/room/anchor_finish_info");
        }
'''+text[b:]
text=text.replace('                CloseSystemProxy();','                // LiveWorkbench never owns or changes the system proxy.')
text=text.replace('                base.RegisterSystemProxy();','                // LiveWorkbench uses an explicit loopback endpoint only.')
p.write_text(text,encoding='utf-8')
p=target_root/'Proxy/SystemProxy.cs';text=p.read_text(encoding='utf-8-sig')
text=text.replace('            OnWebSocketData?.Invoke(this, args);','''            if (args.ProcessName != "直播伴侣" && !LiveWorkbench.CaptureHost.SmokeMode) return;
            LiveWorkbench.CaptureHost.RecordAsync(args.Payload, "frame", args.ProcessName, null, null).GetAwaiter().GetResult();
            OnWebSocketData?.Invoke(this, args);''')
p.write_text(text,encoding='utf-8')
p=target_root/'Server/WssBarrageGrab.cs';text=p.read_text(encoding='utf-8-sig').replace('private byte[] Decompress','public static byte[] Decompress')
p.write_text(text,encoding='utf-8')
p=target_root/'WssBarrageService.csproj';text=p.read_text(encoding='utf-8-sig')
text=text.replace('<AssemblyName>WssBarrageServer</AssemblyName>','<AssemblyName>LiveWorkbench.CaptureHost</AssemblyName>')
text=text.replace('<StartupObject />','<StartupObject>LiveWorkbench.CaptureHost</StartupObject>')
text=text.replace('<Compile Include="AppRuntime.cs" />','<Compile Include="CaptureHost.cs" />\n    <Compile Include="AppRuntime.cs" />')
text=re.sub(r'<PostBuildEvent>.*?</PostBuildEvent>','<PostBuildEvent />',text,flags=re.S)
p.write_text(text,encoding='utf-8')
p=target_root/'App.config';text=p.read_text(encoding='utf-8-sig')
for key,value in {'sysProxy':'false','liveCompanHookSwitch':'false','showWindow':'false','listenAny':'false','barrageFileLog':'false','printBarrage':'false'}.items():
    text=re.sub(r'(<add key="'+key+r'" value=")[^"]*("\s*/>)',lambda m:m[1]+value+m[2],text)
p.write_text(text,encoding='utf-8')
(root/'THIRD_PARTY_NOTICES.md').write_text('''# Third-party provenance

Selected code was extracted from local references on 2026-10-12.

- `src/capture/BarrageGrab`: ape-byte/DouyinBarrageGrab commit c9343da287cf77ce637c11e32333b2a511cd62e9, MIT. License retained at `src/capture/LICENSE.DouyinBarrageGrab`. Mature proxy, HTTP/WSS, protobuf models and gzip implementation retained. First-party changes remove automatic system-proxy/certificate/installation mutation, add RAW ACK IPC, replace entry point and bind loopback. Original Program/Forms remain compiled dependencies, are not the entry point, and are not invoked.
- `src/parser/{parser,decode,wire}.js`: Yellowii/douyinprotobuf commit e9e6cec4a2076dc5aacf94a0ca85ede33274544c, copied without rewriting. The supplied reference has no top-level LICENSE file; no license grant is invented here. Clarify redistribution rights before publishing these reference-derived files.
- `src/parser/vendor`: original official Douyin protocol resources; provenance URLs and SHA-256 retained in vendor/provenance.json. They are not LiveWorkbench-original/MIT assets.
- NuGet/npm dependency notices remain with their packages. Dependencies/binaries are local ignored build artifacts, not third-party repository imports.

`references/` remains untouched and ignored. Extraction manifest records parser source hashes.
''',encoding='utf-8')
(root/'src/parser/extraction.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('Selected C# capture and official Parser sources migrated into src; references unchanged.')
