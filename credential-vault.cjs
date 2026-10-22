'use strict';
// Contraseñas cifradas con la cuenta del sistema mediante Electron safeStorage.
// Sin sincronización, sin autocompletar, sin texto plano en disco o en el perfil.
const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto');
const MAX_CREDENTIALS=200;
function httpsOrigin(input){
  try{const u=new URL(input);if(u.protocol!=='https:'||u.username||u.password||u.origin==='null')throw Error();return u.origin;}
  catch{throw Error('Las credenciales solo se guardan para sitios HTTPS seguros.');}
}
function vault(dir,safeStorage){
  const filename=path.join(dir,'gravity-credentials.v1.json');
  function enabled(){
    return Boolean(safeStorage?.isEncryptionAvailable?.()) &&
      (process.platform!=='linux'||safeStorage?.getSelectedStorageBackend?.()!=='basic_text');
  }
  function check(){if(!enabled())throw Error('Cifrado del sistema no disponible. Gravity no guardará contraseñas sin protección.');}
  function read(){
    if(!fs.existsSync(filename))return [];
    if(fs.statSync(filename).size>512*1024)throw Error('Almacén de contraseñas demasiado grande');
    const doc=JSON.parse(fs.readFileSync(filename,'utf8'));
    if(!doc||doc.format!=='gravity-credentials'||doc.version!==1||!Array.isArray(doc.entries)||doc.entries.length>MAX_CREDENTIALS)throw Error('Almacén de contraseñas inválido');
    return doc.entries.map(item=>{
      if(typeof item.id!=='string'||typeof item.username!=='string'||typeof item.secret!=='string'||item.secret.length>32768)throw Error('Registro de credencial inválido');
      return {...item,origin:httpsOrigin(item.origin)};
    });
  }
  function write(entries){
    fs.mkdirSync(dir,{recursive:true});
    const temp=filename+'.tmp-'+randomUUID();
    try{
      fs.writeFileSync(temp,JSON.stringify({format:'gravity-credentials',version:1,entries}),{flag:'wx',mode:0o600});
      fs.renameSync(temp,filename);
    }finally{try{fs.unlinkSync(temp)}catch{}}
  }
  function list(){return {available:enabled(),entries:read().map(({id,origin,username,created})=>({id,origin,username,created}))}}
  function add({origin,username,password}){
    check();const site=httpsOrigin(origin),name=String(username||'').trim(),secret=String(password||'');
    if(!name||name.length>256||!secret||secret.length>4096)throw Error('Usuario o contraseña inválidos');
    const entries=read();const prior=entries.find(x=>x.origin===site&&x.username===name);
    if(!prior&&entries.length>=MAX_CREDENTIALS)throw Error('Máximo de credenciales alcanzado');
    const encrypted=safeStorage.encryptString(secret).toString('base64');
    const next={id:prior?.id||randomUUID(),origin:site,username:name,secret:encrypted,created:Date.now()};
    write(prior?entries.map(x=>x.id===prior.id?next:x):[...entries,next]);
    return {id:next.id,origin:site,username:name};
  }
  function remove(id){
    check();const entries=read();if(!entries.some(x=>x.id===id))return false;
    write(entries.filter(x=>x.id!==id));return true;
  }
  function revealForClipboard(id,origin){
    check();const entry=read().find(x=>x.id===id);
    if(!entry||entry.origin!==httpsOrigin(origin))throw Error('Credencial no disponible para el sitio actual');
    return safeStorage.decryptString(Buffer.from(entry.secret,'base64'));
  }
  return {list,add,remove,revealForClipboard,enabled};
}
module.exports={vault,httpsOrigin,MAX_CREDENTIALS};
