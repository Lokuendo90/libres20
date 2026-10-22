'use strict';
// Registros LOCALES con datos en lista blanca: nunca URLs, texto de páginas, cookies, tokens o rutas.
const fs=require('node:fs');
const path=require('node:path');
const EVENTS=new Set([
  'APP_START','APP_CLEAN_EXIT','PREVIOUS_UNCLEAN_EXIT','PROFILE_RESTORED','PROFILE_READ_ERROR',
  'PROFILE_WRITE_ERROR','BOOKMARK_WRITE_ERROR','WEBPAGE_LOAD_FAILED','RENDERER_CRASH',
  'RENDERER_UNRESPONSIVE','UI_RENDERER_CRASH','PERMISSION_DENIED','PERMISSION_GRANTED',
  'DOWNLOAD_FAILED','NETWORK_BLOCKED','UNHANDLED_REJECTION','UNCAUGHT_EXCEPTION',
  'AUTO_MEMORY_SAVED','AUTO_MEMORY_SAVER_ERROR','CHILD_PROCESS_FAILURE',
  'UPDATE_CHECK','UPDATE_AVAILABLE','UPDATE_DOWNLOADED','UPDATE_ERROR',
  'FILTER_LIST_UPDATED','FILTER_LIST_UPDATE_FAILED'
]);
const NUMERIC_FIELDS=new Set(['errorCode','tabCount','liveTabs','suspendedTabs','privateTabs','count','memoryMB']);
const ENUMS={
  reason:new Set(['crashed','killed','oom','abnormal-exit','launch-failed','integrity-failure','unknown']),
  scope:new Set(['normal','private','app']),
  permission:new Set(['media','notifications','geolocation','fullscreen','clipboard-sanitized-write','other'])
};
const MAX_BYTES=128*1024;
function sanitizedMetadata(meta){
  const output={};
  if(!meta||typeof meta!=='object')return output;
  for(const [key,value] of Object.entries(meta)){
    if(NUMERIC_FIELDS.has(key)&&typeof value==='number'&&Number.isFinite(value))output[key]=Math.round(Math.max(-1e9,Math.min(value,1e9))*10)/10;
    if(ENUMS[key]&&ENUMS[key].has(value))output[key]=value;
  }
  return output;
}
function createLocalDiagnostics(folder,options={}){
  const maxBytes=options.maxBytes||MAX_BYTES;
  const file=path.join(folder,'gravity-events.jsonl');
  try{fs.mkdirSync(folder,{recursive:true,mode:0o700});}catch{}
  function rotate(){
    if(!fs.existsSync(file)||fs.statSync(file).size<maxBytes)return;
    for(let i=2;i>=1;i--){const older=`${file}.${i}`;const newer=`${file}.${i+1}`;
      try{if(fs.existsSync(older))fs.renameSync(older,newer)}catch{}
    }
    try{fs.renameSync(file,`${file}.1`)}catch{}
  }
  return {
    file,folder,
    write(name,meta={}){
      if(!EVENTS.has(name))return false;
      try{
        rotate();
        fs.appendFileSync(file,JSON.stringify({timestamp:new Date().toISOString(),event:name,...sanitizedMetadata(meta)})+'\n',{encoding:'utf8',mode:0o600});
        return true;
      }catch{return false}
    }
  };
}
module.exports={createLocalDiagnostics,sanitizedMetadata,EVENTS,MAX_BYTES};
