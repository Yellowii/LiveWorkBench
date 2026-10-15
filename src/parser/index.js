import {loadBoundedParser as loadParser} from './load-bounded.js';
import {decodeBusiness,decodePacket,resolveBusiness} from './decode.js';
export class OfficialParser {
  version='douyinprotobuf-e9e6cec-business-v1';
  static async open(){const instance=new OfficialParser();instance.native=await loadParser();return instance;}
  decode(input){
    if(input.format==='business-payload')return [decodeBusiness(this.native,input.method,input.bytes)];
    return decodePacket(this.native,input.bytes,{format:input.format==='response'?'response':'auto'}).messages;
  }
  decodeTransport(messages){return messages.map(m=>({...decodeBusiness(this.native,m.method,Buffer.from(m.payloadBase64,'base64')),msg_id:String(m.msgId??'0')}));}
  parseBusiness({method,msgId},bytes){
    try{
      const native=decodeBusiness(this.native,method,bytes);
      return {method,msg_id:String(msgId||'0'),status:native.status,type:native.type||null,data:native.data??null,errorCode:native.status==='error'?(bytes.length>8*1024*1024?'BUSINESS_PROTO_TOO_LARGE':'BUSINESS_PROTO_INVALID'):native.status==='unknown'?'BUSINESS_METHOD_UNKNOWN':null,parserVersion:this.version};
    }catch{return {method,msg_id:String(msgId||'0'),status:'error',data:null,errorCode:'BUSINESS_PROTO_INVALID',parserVersion:this.version};}
  }
}
