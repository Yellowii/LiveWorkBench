import http from 'node:http';
import net from 'node:net';
export class DirectBrowserTunnel{
 constructor(transport,onResult=()=>{}){this.transport=transport;this.onResult=onResult;this.sockets=new Set();}
 async start(){this.server=http.createServer((_req,res)=>{res.writeHead(405);res.end();});this.server.on('connect',async(req,socket,head)=>{this.sockets.add(socket);socket.once('close',()=>this.sockets.delete(socket));socket.on('error',()=>{});
   try{if(this.sockets.size>64||!req.url.endsWith(':443'))throw new Error();const hostname=req.url.slice(0,-4),resolved=await this.transport.options('https://'+hostname,{mode:'direct'},{browserAsset:true});const address=await new Promise((resolve,reject)=>resolved.request.lookup(hostname,{},(e,v)=>e?reject(e):resolve(v)));
    if(socket.destroyed)return;this.onResult({dns:resolved.diagnostic.dns,pinnedAddress:address});const upstream=net.connect({host:address,port:443});this.sockets.add(upstream);upstream.once('close',()=>this.sockets.delete(upstream));upstream.on('error',()=>{this.onResult({connectionState:'failed',errorCode:'NETWORK_CONNECT_FAILED'});socket.destroy();});socket.once('close',()=>upstream.destroy());upstream.setTimeout(90000,()=>upstream.destroy());upstream.once('connect',()=>{this.onResult({connectionState:'tunnel-connected',errorCode:null});socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');if(head.length)upstream.write(head);socket.pipe(upstream);upstream.pipe(socket);});
   }catch(error){this.onResult({dns:error.network?.dns||'unavailable',connectionState:'not-attempted',errorCode:error.message.startsWith('NETWORK_')?error.message:'NETWORK_TARGET_INVALID'});socket.end('HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n');}
  });await new Promise((resolve,reject)=>{this.server.once('error',reject);this.server.listen(0,'127.0.0.1',resolve);});this.url='http://127.0.0.1:'+this.server.address().port;
 }
 async close(){for(const socket of this.sockets)socket.destroy();this.sockets.clear();if(this.server?.listening)await new Promise(resolve=>this.server.close(resolve));}
}
