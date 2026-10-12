import {createHash} from 'node:crypto';
export class ProcessingPipeline {
 constructor(runtime){this.runtime=runtime;}
  async process(raw,bytes,transport){
    const started=performance.now();let error=false;
    try{
      if(raw.format==='http-json'){const persisted=await this.runtime.unpacker.readRaw(raw);if(createHash('sha256').update(persisted).digest('hex')!==raw.contentHash)throw new Error('RAW_HASH_MISMATCH');return this.runtime.httpEvidence(raw,persisted);}
      const unpacked=await this.runtime.unpacker.unpack(raw,{transport});
      if(unpacked.status==='error'){error=true;this.runtime.log(unpacked.errorCode,{rawId:raw.rawId,stage:unpacked.stage});this.runtime.publish(raw,{method:'ParseFailed',status:'error'});return;}
      for(const indexed of unpacked.messages){
        const {message,attempt}=await this.runtime.parseProto(indexed,raw.runtimeNamespace,'pipeline');
        if(message.status==='error')error=true;const duplicates=this.runtime.metrics.duplicates;const event=this.runtime.publish(raw,message);
        this.runtime.store.protos.link(indexed.protoId,raw.runtimeNamespace,{eventId:event?.eventId||null,attemptId:attempt.attemptId,publicationStatus:event?(this.runtime.metrics.duplicates>duplicates?'duplicate':'published'):'suppressed'});
        this.runtime.store.protos.update(indexed.protoId,{parseStatus:message.status,errorCode:message.errorCode,eventId:event?.eventId||null,attemptId:attempt.attemptId},raw.runtimeNamespace);
      }
    }catch{error=true;this.runtime.log('PARSE_FAILED',{rawId:raw.rawId});this.runtime.publish(raw,{method:'ParseFailed',status:'error'});}finally{this.runtime.timing('parse',started,error);}
  }
  async parseProto(indexed,runtimeNamespace,origin){
    let message;const started=performance.now();
    try{message=this.runtime.parser.parseBusiness(indexed,await this.runtime.unpacker.readPayload(indexed.protoId));}
    catch(error){message={method:indexed.method,msg_id:indexed.msgId,status:'error',data:null,errorCode:error.message==='PROTO_PAYLOAD_HASH_MISMATCH'?error.message:'PROTO_PAYLOAD_READ_FAILED',parserVersion:this.runtime.parser.version};}
    this.runtime.timing('businessParse',started,message.status==='error');
    const attempt=this.runtime.store.protos.attempt({protoId:indexed.protoId,rawId:indexed.rawId,runtimeNamespace,origin,parseStatus:message.status,errorCode:message.errorCode,parserVersion:message.parserVersion,payloadHash:indexed.payloadHash,official:message.data});
    return {message,attempt};
  }
}
