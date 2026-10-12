import {loadParser} from './parser.js';
import {decodeBusiness,decodePacket,resolveBusiness} from './decode.js';
export class OfficialParser {
  static async open(){const instance=new OfficialParser();instance.native=await loadParser();return instance;}
  decode(input){
    if(input.format==='business-payload')return [decodeBusiness(this.native,input.method,input.bytes)];
    return decodePacket(this.native,input.bytes,{format:input.format==='response'?'response':'auto'}).messages;
  }
  decodeTransport(messages){return messages.map(m=>({...decodeBusiness(this.native,m.method,Buffer.from(m.payloadBase64,'base64')),msg_id:String(m.msgId??'0')}));}
}
