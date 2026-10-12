export class GatewaySocketHub {
 constructor(wss,runtime,{intervalMs=15000,timeoutMs=10000}={}){
  this.wss=wss;this.runtime=runtime;this.intervalMs=Math.max(20,intervalMs);this.timeoutMs=Math.max(40,timeoutMs);this.stats={connections:0,pings:0,pongs:0,timeouts:0,backpressure:0};this.peers=new Map();
  wss.on('connection',ws=>{const peer={waitingSince:null};this.peers.set(ws,peer);this.stats.connections++;ws.on('pong',()=>{peer.waitingSince=null;this.stats.pongs++;});ws.once('close',()=>this.peers.delete(ws));ws.on('error',()=>{});});
  this.timer=setInterval(()=>this.tick(),this.intervalMs);this.timer.unref();
 }
 tick(){const now=performance.now();for(const [ws,peer]of this.peers){if(ws.readyState!==1)continue;if(peer.waitingSince!==null){if(now-peer.waitingSince>=this.timeoutMs){this.stats.timeouts++;this.runtime.log('GATEWAY_CLIENT_TIMEOUT');ws.terminate();}continue;}peer.waitingSince=now;this.stats.pings++;ws.ping();}}
 publish(channel,data){const text=JSON.stringify({schemaVersion:'1',channel,data});for(const ws of this.wss.clients)if(ws.readyState===1){if(ws.bufferedAmount>1024*1024){this.stats.backpressure++;ws.close(1013,'Persistent history resync required');}else ws.send(text);}}
 view(){return {...this.stats,clients:this.wss.clients.size,intervalMs:this.intervalMs,timeoutMs:this.timeoutMs};}
 close(){clearInterval(this.timer);for(const ws of this.wss.clients)ws.terminate();this.peers.clear();}
}
