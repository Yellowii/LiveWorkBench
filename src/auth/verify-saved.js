import {LoginBrowserSession} from './login-browser-session.js';
// Read-only official self verification. This temporary headless context owns no
// capture source and never replaces or clears the stored credential snapshot.
export async function verifySavedAccount(options,{client=new LoginBrowserSession(),timeoutMs=45000}={}){
 let timer,finish;
 const result=new Promise(resolve=>{finish=resolve;timer=setTimeout(()=>resolve({state:'UNKNOWN',reasonCode:'AUTH_OFFICIAL_QUERY_TIMEOUT'}),timeoutMs);});
 const listener=status=>{if(status.state==='AUTHENTICATED'&&status.source==='official-self-api')finish(status);else if(status.state==='ANONYMOUS')finish(status);};
 client.on('status',listener);
 try{await client.open({...options,headless:true});return await result;}
 catch{return {state:'ERROR',reasonCode:'AUTH_OFFICIAL_QUERY_UNAVAILABLE'};}
 finally{clearTimeout(timer);client.off('status',listener);await client.close();}
}
