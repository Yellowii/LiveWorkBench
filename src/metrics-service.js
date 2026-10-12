export class MetricsService {
 constructor(){this.values={inputs:0,decoded:0,unknown:0,failed:0,duplicates:0,events:0};}
 timing(stage,started,error=false){this.values.timings??={};const value=this.values.timings[stage]??={count:0,errors:0,totalMs:0,maxMs:0};const duration=performance.now()-started;value.count++;value.errors+=error?1:0;value.totalMs+=duration;value.maxMs=Math.max(value.maxMs,duration);value.lastMs=duration;}
}
