export class LogService {
 constructor(store,bus){this.store=store;this.bus=bus;}
 write(code,details={}){const log=this.store.log(code,details);this.bus.emit('log.appended',log);return log;}
}
