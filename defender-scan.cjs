'use strict';
// Escaneo complementario con Microsoft Defender instalado en el dispositivo.
// No ejecuta archivos descargados. Exit=0 puede significar 'limpio' O 'amenaza remediada'.
const fs=require('node:fs');
const path=require('node:path');
const cp=require('node:child_process');
function defenderExecutable(env=process.env){
  const programData=env.ProgramData||env.PROGRAMDATA||'C:\\ProgramData';
  const programFiles=env.ProgramFiles||env.PROGRAMFILES||'C:\\Program Files';
  const root=path.win32.join(programData,'Microsoft','Windows Defender','Platform');
  try{
    for(const folder of fs.readdirSync(root).sort().reverse()){
      const target=path.win32.join(root,folder,'MpCmdRun.exe');
      if(fs.existsSync(target))return target;
    }
  }catch{}
  const standard=path.win32.join(programFiles,'Windows Defender','MpCmdRun.exe');
  return fs.existsSync(standard)?standard:'';
}
function scanDownloadedFile(filepath,{platform=process.platform,execute=cp.execFile,exe=defenderExecutable()}={}){
  if(platform!=='win32')return Promise.resolve({status:'unavailable',message:'El análisis de Microsoft Defender requiere Windows.'});
  if(!filepath||!fs.existsSync(filepath))return Promise.resolve({status:'unavailable',message:'No se encontró el archivo para analizar.'});
  if(!exe)return Promise.resolve({status:'unavailable',message:'Microsoft Defender no está disponible en este equipo. Gravity no certifica este archivo.'});
  return new Promise(resolve=>{
    let finished=false;
    function done(result){if(!finished){finished=true;resolve(result)}}
    try{
      execute(exe,['-Scan','-ScanType','3','-File',filepath],{windowsHide:true,timeout:90000,maxBuffer:300000},error=>{
        if(!error)return done({status:'review',message:'Microsoft Defender terminó el análisis. El código 0 también puede indicar amenazas remediadas: revisa Seguridad de Windows antes de abrir.'});
        if(error.killed||error.code==='ETIMEDOUT')return done({status:'unavailable',message:'El análisis agotó el tiempo; no se verificó el archivo.'});
        if(error.code===2)return done({status:'alert',message:'Microsoft Defender informó una detección que requiere intervención o un error. NO abras el archivo. Consulta Seguridad de Windows.'});
        done({status:'unavailable',message:'No pudo completarse el análisis. Comprueba el estado de Microsoft Defender.'});
      });
    }catch{done({status:'unavailable',message:'No se pudo iniciar Microsoft Defender.'})}
  });
}
module.exports={defenderExecutable,scanDownloadedFile};
