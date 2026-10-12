// Diagnostic probe only. Synthetic inputs; never launches the original Main,
// constructs a proxy, opens a listener, or initializes AppRuntime.Init().
using System;
using System.Collections;
using System.Collections.Generic;
using System.Collections.Concurrent;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Reflection;
using System.Runtime.Serialization;
using BarrageGrab;
using BarrageGrab.Modles;
using BarrageGrab.Modles.ProtoEntity;
using BarrageGrab.Modles.JsonEntity;
using BarrageGrab.Proxy.ProxyEventArgs;
using Newtonsoft.Json;
using ProtoBuf;

class OriginalOfflineProbe
{
    const BindingFlags Hidden = BindingFlags.Instance | BindingFlags.NonPublic;
    static readonly List<object> Results = new List<object>();
    static int failures;
    static void Check(string name, bool ok, object observed)
    {
        Results.Add(new { name, passed = ok, observed, inputKind = "synthetic" });
        if (!ok) failures++;
    }
    static object Call(object target, string name, params object[] args)
    {
        try { return target.GetType().GetMethod(name, Hidden).Invoke(target, args); }
        catch (TargetInvocationException ex) { throw ex.InnerException; }
    }
    static void Set(object target, string field, object value)
    { target.GetType().GetField(field, Hidden).SetValue(target, value); }
    static byte[] Bytes<T>(T value)
    { using (var s = new MemoryStream()) { Serializer.Serialize(s, value); return s.ToArray(); } }
    static byte[] Gzip(byte[] value)
    {
        using (var s = new MemoryStream())
        { using (var z = new GZipStream(s, CompressionMode.Compress, true)) z.Write(value, 0, value.Length); return s.ToArray(); }
    }
    static WssBarrageGrab Grab()
    {
        var g = (WssBarrageGrab)FormatterServices.GetUninitializedObject(typeof(WssBarrageGrab));
        Set(g, "msgDic", new Dictionary<string, List<long>>());
        var st = typeof(WssBarrageGrab).Assembly.GetType("BarrageGrab.AppSetting");
        Set(g, "appsetting", st.GetProperty("Current").GetValue(null));
        return g;
    }
    static Message Chat(long id, long room)
    { return new Message { Method = "WebcastChatMessage", msgId = id, Payload = Bytes(new ChatMessage { Common = new Common { msgId = id, roomId = room }, Content = "synthetic" }) }; }
    static void CreateCases()
    {
        string data = "\"data\":{\"id_str\":\"101\",\"status\":STATUS,\"owner\":{\"id_str\":\"201\",\"nickname\":\"synthetic\",\"sec_uid\":\"synthetic\"}}";
        foreach (int platform in new[] { 0, 12345 }) foreach (int status in new[] { 1, 2 })
        {
            RoomInfo room;
            var r = RoomInfo.TryParseStreamPusherCreate("{\"status_code\":" + platform + "," + data.Replace("STATUS", status.ToString()) + "}", out room);
            Check("create-code-" + platform + "-status-" + status, r.Item1 == 0 && room.IsLive == (status == 2), new { localCode = r.Item1, platformCode = platform, room.IsLive, room.RoomId });
        }
        foreach (string json in new[] { "not-json", "null", "{}", "{\"status_code\":12345,\"data\":null}", "{\"data\":{}}", "{\"data\":{\"room_view_stats\":{\"display_value\":\"1.2万\"}}}" })
        {
            try { RoomInfo room; var r = RoomInfo.TryParseStreamPusherCreate(json, out room); Check("create-invalid-shape", true, new { json, localCode = r.Item1, roomPresent = room != null }); }
            catch (Exception e) { Check("create-invalid-shape", true, new { json, exception = e.GetType().Name }); }
        }
    }
    static void DedupCases()
    {
        var g = Grab(); int count = 0; g.OnChatMessage += (s, e) => count++;
        Call(g, "DoMessage", Chat(7, 101), "直播伴侣"); Call(g, "DoMessage", Chat(7, 102), "chrome");
        Check("dedup-cross-room-collision", count == 1, new { accepted = count, submitted = 2 });
        var dict = (Dictionary<string, List<long>>)typeof(WssBarrageGrab).GetField("msgDic", Hidden).GetValue(g);
        Call(g, "DoMessage", new Message { Method = "UnknownSynthetic", msgId = 7, Payload = new byte[] { 255 } }, "chrome");
        Check("dedup-method-separated-unknown-retained-in-cache", dict.Count == 2, new { methodKeys = dict.Count });
        var z = Grab(); int zero = 0; z.OnChatMessage += (s, e) => zero++;
        Call(z, "DoMessage", Chat(0, 101), "chrome"); Call(z, "DoMessage", Chat(0, 101), "chrome");
        Check("dedup-zero-collapses", zero == 1, new { accepted = zero });
        var w = Grab(); int window = 0; w.OnChatMessage += (s, e) => window++;
        for (int i = 1; i <= 301; i++) Call(w, "DoMessage", Chat(i, 101), "chrome");
        Call(w, "DoMessage", Chat(1, 101), "chrome");
        Check("dedup-300-eviction", window == 302, new { accepted = window });
        var bad = Grab(); int repaired = 0; bad.OnChatMessage += (s, e) => repaired++;
        Call(bad, "DoMessage", new Message { Method = "WebcastChatMessage", msgId = 55, Payload = new byte[] { 255 } }, "chrome");
        Call(bad, "DoMessage", Chat(55, 101), "chrome");
        Check("dedup-failed-parse-poisons-retry", repaired == 0, new { accepted = repaired });
    }
    static void TransportCases()
    {
        var g = Grab(); int count = 0; g.OnChatMessage += (s, e) => count++;
        var r = new Response(); r.Messages.Add(Chat(9007199254740993L, 101)); var body = Bytes(r);
        File.WriteAllBytes("synthetic-response.bin", body);
        Call(g, "Proxy_OnFetchResponse", null, new HttpResponseEventArgs { Payload = body, ProcessName = "chrome" });
        Check("http-response-protobuf", count == 1, new { count, bytes = body.Length });
        var frame = new WssResponse { Seqid = 1, Payload = Gzip(body) }; frame.Headers.Add("compress_type", "gzip");
        var wg = Grab(); int ws = 0; wg.OnChatMessage += (s, e) => ws++;
        var bytes = Bytes(frame);
        File.WriteAllBytes("synthetic-gzip-pushframe.bin", bytes);
        Call(wg, "Proxy_OnWebSocketData", null, new WsMessageEventArgs { Payload = bytes, ProcessName = "chrome" });
        Check("wss-gzip-protobuf", ws == 1, new { ws, bytes = bytes.Length, firstByte = bytes[0] });
        frame.Seqid = 0; var missingSeq = Bytes(frame); var sg = Grab(); int seqCount = 0; sg.OnChatMessage += (s, e) => seqCount++;
        File.WriteAllBytes("synthetic-no-seqid-pushframe.bin", missingSeq);
        Call(sg, "Proxy_OnWebSocketData", null, new WsMessageEventArgs { Payload = missingSeq, ProcessName = "chrome" });
        Check("wss-first-byte-gate", seqCount == 0, new { accepted = seqCount, firstByte = missingSeq[0] });
        frame.Seqid = 1; frame.Headers.Clear(); var ng = Grab(); int noHeader = 0; ng.OnChatMessage += (s, e) => noHeader++;
        Call(ng, "Proxy_OnWebSocketData", null, new WsMessageEventArgs { Payload = Bytes(frame), ProcessName = "chrome" });
        Check("wss-missing-compression-header-dropped", noHeader == 0, new { accepted = noHeader });
    }
    static WsBarrageServer Server()
    {
        var s = (WsBarrageServer)FormatterServices.GetUninitializedObject(typeof(WsBarrageServer));
        Set(s, "giftCountCache", new ConcurrentDictionary<string, Tuple<int, DateTime>>());
        var sockets = typeof(WsBarrageServer).GetField("socketList", Hidden);
        sockets.SetValue(s, Activator.CreateInstance(sockets.FieldType));
        var st = typeof(WssBarrageGrab).Assembly.GetType("BarrageGrab.AppSetting");
        var settings = st.GetProperty("Current").GetValue(null);
        st.GetProperty("PrintBarrage").SetValue(settings, false); Set(s, "Appsetting", settings);
        typeof(AppRuntime).GetProperty("RoomCaches").GetSetMethod(true).Invoke(null, new object[] { new AppRuntime.RoomCacheManager() });
        return s;
    }
    static void Gift(WsBarrageServer s, int count, int end, long user)
    {
        var gift = new GiftMessage { Common = new Common { roomId = 101, msgId = count }, giftId = 1, groupId = 22, repeatCount = count, repeatEnd = end, User = new User { Id = user, Nickname = "synthetic" }, Gift = new GiftStruct { Name = "synthetic", Combo = true } };
        Call(s, "Grab_OnGiftMessage", null, new WssBarrageGrab.RoomMessageEventArgs<GiftMessage>("直播伴侣", gift));
    }
    static void GiftAndControlCases()
    {
        var s = Server(); var deltas = new List<long>(); int controls = 0;
        s.OnPackMessage += (sender, e) => { if (e.Message is GiftMsg) deltas.Add(((GiftMsg)e.Message).GiftCount); else controls++; };
        Gift(s, 1, 0, 201); Gift(s, 3, 0, 201); Gift(s, 2, 0, 201); Gift(s, 5, 1, 201);
        Check("gift-end-higher-count-dropped", deltas.SequenceEqual(new long[] { 1, 2 }), new { deltas = deltas.ToArray(), reportedFinal = 5, summed = deltas.Sum() });
        Gift(s, 5, 1, 201);
        Check("gift-repeated-end-recounts-after-cache-clear", deltas.SequenceEqual(new long[] { 1, 2, 5 }), new { deltas = deltas.ToArray(), summed = deltas.Sum() });
        var cross = Server(); var userDeltas = new List<long>(); cross.OnPackMessage += (sender, e) => userDeltas.Add(((GiftMsg)e.Message).GiftCount);
        Gift(cross, 1, 0, 201); Gift(cross, 1, 0, 202);
        Check("gift-key-without-sender-collision", userDeltas.SequenceEqual(new long[] { 1 }), new { senders = 2, deltas = userDeltas.ToArray() });
        var ctrl = new ControlMessage { Common = new Common { msgId = 400, roomId = 101 }, Status = 3 };
        Call(s, "Grab_OnControlMessage", null, new WssBarrageGrab.RoomMessageEventArgs<ControlMessage>("直播伴侣", ctrl));
        Call(s, "Grab_OnControlMessage", null, new WssBarrageGrab.RoomMessageEventArgs<ControlMessage>("直播伴侣", ctrl));
        Check("control-handler-no-session-idempotence", controls == 2, new { endPackets = controls });
        RoomInfo room;
        RoomInfo.TryParseStreamPusherCreate("{\"status_code\":0,\"data\":{\"id_str\":\"101\",\"status\":1,\"owner\":{\"id_str\":\"201\",\"nickname\":\"synthetic\",\"sec_uid\":\"synthetic\"}}}", out room);
        var lifecycle = Server(); var starts = new List<long>();
        lifecycle.OnPackMessage += (sender, e) => starts.Add(e.Message.MsgId);
        var action = new LiveCompanEventArgs { Action = 1, Data = room, ProcessName = "直播伴侣" };
        Call(lifecycle, "Proxy_OnLiveCompanAction", null, action);
        Call(lifecycle, "Proxy_OnLiveCompanAction", null, action);
        Check("created-not-live-still-broadcasts-duplicate-start", starts.Count == 2 && !room.IsLive, new { startPackets = starts.Count, room.IsLive, generatedMsgIds = starts.ToArray() });
    }
    static int Main(string[] args)
    {
        try { CreateCases(); DedupCases(); TransportCases(); GiftAndControlCases(); }
        catch (Exception e) { Check("probe-unexpected-error", false, new { exception = e.GetType().Name, e.Message, e.StackTrace }); }
        File.WriteAllText(args[0], JsonConvert.SerializeObject(new { inputKind = "synthetic", failures, checks = Results }, Formatting.Indented));
        Console.WriteLine("Synthetic original-method observations: " + Results.Count + "; probe failures: " + failures);
        return failures == 0 ? 0 : 1;
    }
}
