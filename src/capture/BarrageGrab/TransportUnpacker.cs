using System;
using System.IO;
using System.Linq;
using ProtoBuf;
using BarrageGrab.Modles.ProtoEntity;
namespace LiveWorkbench {
    // Reused BarrageGrab transport models and GZip, no business parsing/deduplication.
    internal static class TransportUnpacker {
        internal static object[] Unpack(byte[] bytes,string format) {
            byte[] payload=bytes;
            if(format=="frame") {
                var frame=Serializer.Deserialize<WssResponse>(new MemoryStream(bytes));
                if(frame.Payload==null)throw new InvalidOperationException("TRANSPORT_ENVELOPE_INVALID");
                var compressed=frame.Headers.Any(h=>h.Key=="compress_type"&&h.Value=="gzip")||frame.payloadEncoding=="gzip";
                payload=compressed?BarrageGrab.WssBarrageGrab.Decompress(frame.Payload):frame.Payload;
            }
            var response=Serializer.Deserialize<Response>(new MemoryStream(payload));
            return response.Messages.Select(m=>(object)new {method=m.Method,msgId=m.msgId.ToString(),payloadBase64=Convert.ToBase64String(m.Payload)}).ToArray();
        }
    }
}
