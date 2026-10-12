// ACK encoding mirrors the pinned upstream transport contract. No business decoding.
export function webProtocolPacket(native,{frame,response},{modernAck=false}={}){
 const headers=Object.fromEntries((frame?.headers||[]).map(x=>[x.key,x.value]));
 const modern=modernAck||Number(frame?.service)===9999||!!headers['X-ByteLink-InternalExt'];
 const ext=headers['X-ByteLink-InternalExt']||response?.internal_ext||'';
 return {messages:[],ack:response?.need_ack&&frame?()=>native.types.get('webcast.im.PushFrame').original.encode({SeqID:frame.SeqID,LogID:frame.LogID,service:modern?9999:frame.service,method:modern?1:frame.method,payload_type:'ack',payload_encoding:modern?'pb':'',headers:modern?[{key:'X-ByteLink-InternalExt',value:ext},{key:'client_recv_times_ms',value:String(Date.now())},{key:'client_ack_time_ms',value:String(Date.now())}]:[],payload:modern?Buffer.alloc(0):Buffer.from(ext)}).finish():null};
}
