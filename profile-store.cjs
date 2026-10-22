'use strict';
// Persistencia local de Gravity. Sin red ni telemetría. Conserva archivos de respaldo.
const fs = require('node:fs');
const path = require('node:path');
const MAX_BYTES = 8 * 1024 * 1024;

function parseCandidate(file) {
  if (!fs.existsSync(file)) return {value:null,reason:'missing'};
  try {
    if(fs.statSync(file).size > MAX_BYTES) return {value:null,reason:'too-large'};
    const value=JSON.parse(fs.readFileSync(file,'utf8'));
    if(!value||typeof value!=='object'||Array.isArray(value))return {value:null,reason:'invalid'};
    return {value,reason:null};
  } catch {return {value:null,reason:'invalid'}}
}
function readProfile(file,log=()=>{}) {
  const primary=parseCandidate(file);
  if(primary.value)return {value:primary.value,from:'primary'};
  if(primary.reason!=='missing'){
    // Conservar el archivo dañado antes de que el guardado lo sustituya.
    try{
      const stamp=new Date().toISOString().replace(/[:.]/g,'-');
      const quarantine=`${file}.corrupt-${stamp}`;
      fs.copyFileSync(file,quarantine,fs.constants.COPYFILE_EXCL);
      log('Perfil principal no legible; copia de seguridad local preservada.');
    }catch{log('No se pudo copiar el perfil inválido.');}
  }
  for(const [suffix,from] of [['.bak','backup'],['.backup-before-pro','legacy-backup']]){
    const candidate=parseCandidate(file+suffix);
    if(candidate.value){log('Se recuperó el perfil desde un respaldo local.');return {value:candidate.value,from}}
  }
  return {value:null,from:'empty'};
}
function writeProfile(file,value,log=()=>{}) {
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const tmp=`${file}.tmp`;
  const raw=JSON.stringify(value,null,2);
  if(Buffer.byteLength(raw,'utf8')>MAX_BYTES)throw new Error('El perfil supera el tamaño permitido.');
  let fd;
  try{
    fd=fs.openSync(tmp,'w',0o600);
    fs.writeFileSync(fd,raw,'utf8');
    fs.fsyncSync(fd);
  } finally {if(fd!==undefined)fs.closeSync(fd)}
  // .bak conserva la última versión íntegra, nunca sobrescribimos el respaldo con JSON corrupto.
  try{
    if(parseCandidate(file).value)fs.copyFileSync(file,file+'.bak');
  }catch{log('No se pudo actualizar la copia secundaria del perfil.');}
  try{fs.renameSync(tmp,file)}catch(error){
    try{fs.unlinkSync(tmp)}catch{}
    throw error;
  }
}
module.exports={readProfile,writeProfile,MAX_BYTES};
