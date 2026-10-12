// Versioned first-party normalization. Never changes the official data object.
export function parserExtensions({official,raw,message,roomId,commonRoom,isControlEnd,associatedEnd}){
 const common=official?.common||{},extensions={extensionVersion:'dictionary-extension-v1'};
 if(official?.user?.webcast_uid)extensions.userIdAlias=official.user.webcast_uid;
 if(roomId)extensions.roomContextSource=commonRoom?'common.room_id':raw.observedRoomId?'registered-source-context':'capture-evidence';
 const seconds=Number(common.create_time),milliseconds=seconds*1000;
 const validTime=Number.isFinite(milliseconds)&&Math.abs(milliseconds)<=8.64e15&&Number.isSafeInteger(seconds)&&seconds>0;
 const occurredAt=validTime?new Date(milliseconds).toISOString():null;
 if(common.create_time&&!validTime)extensions.occurredAtReason='OFFICIAL_TIME_NOT_REPRESENTABLE_AS_SECONDS';
 if(raw.originalSequence)extensions.originalSequence=raw.originalSequence;
 if(raw.indexMsgId)extensions.indexMsgId=raw.indexMsgId;
 if(message.msg_id)extensions.transportMsgId=String(message.msg_id);
 if(isControlEnd)extensions.lifecycleCandidate=associatedEnd?'platform-ended':'unassociated-platform-end';
 return {extensions,occurredAt};
}
