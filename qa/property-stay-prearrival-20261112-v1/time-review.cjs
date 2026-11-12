'use strict';
// Reuse only the two original pure time functions; NEVER import backend/index.js.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../../..','backend/index.js'),'utf8');
function extract(name){const start=source.indexOf('function '+name+'('),end=source.indexOf('\n}\n',start);if(start<0||end<0)throw Error('PINNED_TIME_SOURCE_DRIFT');return source.slice(start,end+2);}
const raw=vm.runInNewContext(extract('conciergeDateParts')+'\n'+extract('conciergeZonedLocalToIso')+'\nconciergeZonedLocalToIso',{Date,Intl});
function localToIso(value,{baseline=false}={}){
 if(typeof value!=='string'||!/^20\d\d-\d\d-\d\dT\d\d:\d\d$/.test(value))return null;
 const [year,month,day,hour,minute]=value.match(/\d+/g).map(Number),parts={year,month,day,hour,minute};
 if(month<1||month>12||day<1||day>31||hour>23||minute>59)return null;
 if(!baseline){
  const date=new Date(Date.UTC(year,month-1,day,hour,minute));
  if(date.getUTCFullYear()!==year||date.getUTCMonth()+1!==month||date.getUTCDate()!==day)return null;
 }
 return raw(parts,'America/Argentina/Buenos_Aires');
}
module.exports={localToIso};
