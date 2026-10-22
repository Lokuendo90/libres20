'use strict';
// Los filtros se actualizan desde fuentes fijas, no desde URLs de navegación ni búsquedas.
// El proveedor de la lista ve la conexión/IP al solicitar una actualización.
const fs=require('node:fs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const SUCCESS_PERIOD_MS=7*24*60*60*1000;
const FAILURE_BACKOFF_MS=6*60*60*1000;
function readTimestamp(file){
  try{
    const o=JSON.parse(fs.readFileSync(file,'utf8'));
    return typeof o.timestamp==='number'&&Number.isFinite(o.timestamp)&&o.timestamp>0?o.timestamp:0;
  }catch{return 0}
}
function shouldRefreshFilters(rulesFile,attemptFile,now=Date.now()){
  const attempted=readTimestamp(attemptFile);
  if(attempted>0&&now-attempted<FAILURE_BACKOFF_MS)return false;
  try{
    const stat=fs.statSync(rulesFile);
    // Regenerar cachés v1 (solo dominios) para incorporar rutas y selectores v2.
    // Respetar siempre el backoff si una descarga anterior falló.
    if(stat.size>0&&now-stat.mtimeMs<SUCCESS_PERIOD_MS){
      const fd=fs.openSync(rulesFile,'r');const first=Buffer.alloc(150);
      let size=0;try{size=fs.readSync(fd,first,0,first.length,0)}finally{fs.closeSync(fd)}
      const version=/\"version\"\s*:\s*(\d+)/.exec(first.subarray(0,size).toString('utf8'));
      if(version?.[1]!=='1')return false;
    }
  }catch{}
  return true;
}
function writeAttempt(file,now=Date.now()){
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const temp=file+'.'+randomUUID()+'.tmp';
  try{fs.writeFileSync(temp,JSON.stringify({timestamp:now}),{mode:0o600,flag:'wx'});fs.renameSync(temp,file)}
  finally{try{fs.unlinkSync(temp)}catch{}}
}
module.exports={SUCCESS_PERIOD_MS,FAILURE_BACKOFF_MS,shouldRefreshFilters,writeAttempt};
