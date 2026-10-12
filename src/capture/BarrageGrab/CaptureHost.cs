using System;
using System.IO;
using System.Linq;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using ProtoBuf;
using BarrageGrab.Proxy;
using BarrageGrab.Modles.ProtoEntity;

namespace LiveWorkbench {
    // First-party entry. Does not invoke original Program/AppRuntime.Init/Hook installation.
    internal static class CaptureHost {
        internal static int Port = 18827;
        internal static string CertificatePath, CertificatePassword, TestUpstreamCertificate;
        internal static bool SmokeMode;
        static TextWriter Output;
        static readonly object Gate = new object();
        static readonly ConcurrentDictionary<string,TaskCompletionSource<bool>> Pending = new ConcurrentDictionary<string,TaskCompletionSource<bool>>();
        static void Emit(object value) { lock(Gate) { Output.WriteLine(JsonConvert.SerializeObject(value));Output.Flush(); } }
        public static async Task RecordAsync(byte[] bytes,string format,string process,string urlPath,int? httpStatus) {
            if(bytes == null || bytes.Length == 0) return;
            if(bytes.Length > 8*1024*1024) throw new InvalidOperationException("RAW_TOO_LARGE");
            if(Pending.Count >= 64) throw new InvalidOperationException("CAPTURE_BACKPRESSURE");
            var id=Guid.NewGuid().ToString();var ack=new TaskCompletionSource<bool>();Pending[id]=ack;
            try {
                Emit(new {kind="raw",id,format,processName=process,urlPath,httpStatus,receivedAt=DateTime.UtcNow.ToString("o"),payloadBase64=Convert.ToBase64String(bytes)});
                if(await Task.WhenAny(ack.Task,Task.Delay(30000))!=ack.Task || !await ack.Task) throw new InvalidOperationException("RAW_ACK_FAILED");
                // Reuse BarrageGrab protobuf models + gzip after durable RAW ACK.
                if(format=="frame" || format=="response") {
                    try {
                        Emit(new {kind="transport",id,messages=TransportUnpacker.Unpack(bytes,format)});
                    } catch { Emit(new {kind="transport-fallback",id}); }
                }
            } finally { TaskCompletionSource<bool> ignored;Pending.TryRemove(id,out ignored); }
        }
        static async Task ReadCommands() {
            string line;while((line=Console.ReadLine())!=null) {
                try {
                    var msg=JObject.Parse(line);
                    if(msg["kind"]?.ToString()=="ack") {TaskCompletionSource<bool> ack;if(Pending.TryGetValue(msg["id"]?.ToString()??"",out ack)) ack.TrySetResult(msg["ok"]?.Value<bool>()==true);}
                    if(msg["kind"]?.ToString()=="inject" && SmokeMode) {
                        var bytes=Convert.FromBase64String(msg["payloadBase64"].ToString());
                        _=Task.Run(()=>RecordAsync(bytes,msg["format"]?.ToString()??"response","smoke",null,null));
                    }
                    if(msg["kind"]?.ToString()=="stop") return;
                } catch { Emit(new {kind="diagnostic",code="INVALID_COMMAND"}); }
            }
        }
        static void ObserveCompanion() {
            try {
                var processes=Process.GetProcessesByName("直播伴侣");
                var observed=new System.Collections.Generic.List<object>();
                foreach(var process in processes)using(process) {
                    string startedAt=null;bool hasMainWindow=false;
                    try {startedAt=process.StartTime.ToUniversalTime().ToString("o");hasMainWindow=process.MainWindowHandle!=IntPtr.Zero;}catch{}
                    observed.Add(new {pid=process.Id,startedAt,hasMainWindow});
                }
                Emit(new {kind="process-observed",observedAt=DateTime.UtcNow.ToString("o"),processes=observed});
            } catch {Emit(new {kind="diagnostic",code="PROCESS_OBSERVATION_FAILED"});}
        }
        static int Main(string[] args) {
            Console.OutputEncoding=new System.Text.UTF8Encoding(false);
            Console.InputEncoding=new System.Text.UTF8Encoding(false);
            Output=Console.Out;
            Console.SetOut(Console.Error);
            for(int i=0;i<args.Length;i++) {
                if(args[i]=="--port")Port=int.Parse(args[++i]);
                if(args[i]=="--certificate")CertificatePath=args[++i];
                if(args[i]=="--smoke")SmokeMode=true;
                if(args[i]=="--test-upstream-certificate")TestUpstreamCertificate=args[++i];
            }
            if(!SmokeMode && TestUpstreamCertificate!=null){Emit(new {kind="diagnostic",code="TEST_MODE_REQUIRED"});return 2;}
            CertificatePassword=Environment.GetEnvironmentVariable("LW_CERT_PASSWORD")??"";
            // Read-only daemon mode: no proxy, certificate, registry or installation helper constructed.
            if(args.Contains("--observe")) {
                ObserveCompanion();
                using(var timer=new System.Threading.Timer(_=>ObserveCompanion(),null,2000,2000))ReadCommands().GetAwaiter().GetResult();
                return 0;
            }
            if(args.Contains("--stdio")) {Emit(new {kind="ready",proxyBound=false,hookReady=false,smoke=true});ReadCommands().GetAwaiter().GetResult();return 0;}
            if(!SmokeMode && string.IsNullOrEmpty(CertificatePath)){Emit(new {kind="diagnostic",code="TLS_CERTIFICATE_REQUIRED"});return 2;}
            try {
                var proxy=new TitaniumProxy();proxy.Start();
                Emit(new {kind="ready",proxyBound=true,hookReady=false,port=Port,reason="Client routing and restart must be performed manually",companionRunning=Process.GetProcessesByName("直播伴侣").Length>0});
                ReadCommands().GetAwaiter().GetResult();proxy.Dispose();return 0;
            } catch (Exception error) {if(SmokeMode)Console.Error.WriteLine(error);Emit(new {kind="diagnostic",code="PROXY_START_FAILED"});return 1;}
        }
    }
}
