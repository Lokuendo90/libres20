'use strict';
// Perfiles de Gravity: el perfil original sigue viviendo en %APPDATA%/gravity-directo.
// Los adicionales usan subdirectorios propios, sin transferir cookies ni contraseñas.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const VALID_ID=/^[a-z0-9]{12,32}$/;
const MAX_PROFILES=9;
function manifestLocation(root){return path.join(root,'profiles.json')}
function readManifest(root){
  const file=manifestLocation(root);
  try{
    if(fs.statSync(file).size>65536)throw Error('Archivo de perfiles demasiado grande');
    const data=JSON.parse(fs.readFileSync(file,'utf8'));
    if(!data||data.version!==1||!Array.isArray(data.profiles))throw Error('Formato de perfiles inválido');
    const used=new Set();
    const entries=data.profiles.filter(p=>{
      if(!p||!VALID_ID.test(p.id)||typeof p.name!=='string'||p.name.length>40||used.has(p.id))return false;
      used.add(p.id);return true;
    }).slice(0,MAX_PROFILES-1);
    return entries;
  }catch(e){if(e.code==='ENOENT')return [];throw Error('No se puede leer el índice de perfiles; no se sobrescribirá.');}
}
function atomicManifest(root,entries){
  fs.mkdirSync(root,{recursive:true});const filename=manifestLocation(root);
  const pending=filename+'.tmp-'+crypto.randomUUID();
  try{fs.writeFileSync(pending,JSON.stringify({version:1,profiles:entries},null,2),{flag:'wx',mode:0o600});fs.renameSync(pending,filename)}
  finally{try{fs.unlinkSync(pending)}catch{}}
}
function available(root){return [{id:'default',name:'Original (Gravity)'},...readManifest(root)]}
function create(root,name){
  if(typeof name!=='string')throw Error('Nombre inválido');
  const clean=name.trim().replace(/\s+/g,' ');
  if(clean.length<2||clean.length>32||/[\x00-\x1f<>\\/]/.test(clean))throw Error('El perfil debe tener entre 2 y 32 caracteres y no contener rutas.');
  const entries=readManifest(root);
  if(entries.length>=MAX_PROFILES-1)throw Error('Límite de perfiles alcanzado');
  if(available(root).some(x=>x.name.toLocaleLowerCase()===clean.toLocaleLowerCase()))throw Error('Ya existe un perfil con ese nombre');
  const id=crypto.randomBytes(9).toString('hex');
  const folder=path.join(root,'profiles',id);
  fs.mkdirSync(folder,{recursive:true});
  entries.push({id,name:clean});atomicManifest(root,entries);
  return {id,name:clean};
}
function resolve(root,id){
  if(id==='default')return {id:'default',name:'Original (Gravity)',userData:root,partition:'persist:gravity-directo'};
  if(!VALID_ID.test(id||''))throw Error('Identificador de perfil inválido');
  const found=readManifest(root).find(p=>p.id===id);if(!found)throw Error('El perfil solicitado no existe');
  return {...found,userData:path.join(root,'profiles',id),partition:`persist:gravity-profile-${id}`};
}
function selectedFromArgs(argv,root){
  const arg=argv.find(a=>typeof a==='string'&&a.startsWith('--gravity-profile='));
  const id=arg?arg.slice('--gravity-profile='.length):'default';
  return resolve(root,id);
}
function relaunchArgs(argv,id){
  const args=argv.filter(a=>typeof a==='string'&&!a.startsWith('--gravity-profile='));
  if(id!=='default')args.push('--gravity-profile='+id);
  return args;
}
module.exports={available,create,resolve,selectedFromArgs,relaunchArgs};
