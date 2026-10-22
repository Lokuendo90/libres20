'use strict';
// Exportación/importación VOLUNTARIA de conjuntos de pestañas.
// Solo URLs normales, nunca cookies, contraseñas, historial ni pestañas privadas.
const {isAllowedWebNavigation}=require('./security-policy.cjs');
const SESSION_FORMAT='gravity-tabs';
const SESSION_VERSION=1;
const HOME='gravity://home';
const MAX_SESSION_TABS=30;
const MAX_SESSION_BYTES=512*1024;
const MAX_URL_LENGTH=12000;
function validSessionURL(raw){
  if(raw===HOME)return true;
  return typeof raw==='string'&&raw.length<=MAX_URL_LENGTH&&raw.length>0&&
    !/[\x00-\x1f\x7f]/.test(raw)&&isAllowedWebNavigation(raw);
}
function safeURL(raw){
  if(!validSessionURL(raw))return null;
  if(raw===HOME)return HOME;
  try{return new URL(raw).href}catch{return null}
}
function createSessionDocument(tabs,activeId,exportedAt=new Date()){
  if(!Array.isArray(tabs))throw Error('Lista de pestañas inválida');
  const accepted=[];
  for(const tab of tabs){
    if(!tab||tab.private)continue;
    const url=safeURL(tab.url);
    if(url)accepted.push({id:String(tab.id),url});
  }
  if(!accepted.length)throw Error('No hay pestañas normales válidas para guardar.');
  if(accepted.length>MAX_SESSION_TABS)throw Error('Demasiadas pestañas para un conjunto.');
  const selected=accepted.findIndex(tab=>tab.id===String(activeId));
  const document={format:SESSION_FORMAT,version:SESSION_VERSION,
    savedAt:exportedAt.toISOString(),activeIndex:Math.max(0,selected),
    urls:accepted.map(tab=>tab.url)};
  const content=JSON.stringify(document,null,2)+'\n';
  if(Buffer.byteLength(content,'utf8')>MAX_SESSION_BYTES)throw Error('El conjunto supera el límite de 512 KB.');
  return {content,count:accepted.length,excluded:tabs.length-accepted.length};
}
function parseSessionDocument(content){
  if(typeof content!=='string'||Buffer.byteLength(content,'utf8')>MAX_SESSION_BYTES)
    throw Error('Archivo de pestañas demasiado grande o inválido (máximo 512 KB).');
  let doc;try{doc=JSON.parse(content.replace(/^\uFEFF/,''))}catch{throw Error('El archivo no contiene JSON válido.');}
  if(!doc||typeof doc!=='object'||Array.isArray(doc)||doc.format!==SESSION_FORMAT||doc.version!==SESSION_VERSION)
    throw Error('El archivo no es una colección compatible de Gravity.');
  if(!Array.isArray(doc.urls)||doc.urls.length<1||doc.urls.length>MAX_SESSION_TABS)
    throw Error('El conjunto debe contener de 1 a 30 pestañas.');
  if(!Number.isInteger(doc.activeIndex)||doc.activeIndex<0||doc.activeIndex>=doc.urls.length)
    throw Error('La posición activa del conjunto es inválida.');
  const urls=doc.urls.map(raw=>safeURL(raw));
  if(urls.some(url=>url===null))throw Error('El conjunto incluye direcciones inseguras o inválidas; no se abrió ninguna pestaña.');
  return {urls,activeIndex:doc.activeIndex};
}
module.exports={SESSION_FORMAT,SESSION_VERSION,MAX_SESSION_TABS,MAX_SESSION_BYTES,validSessionURL,
  createSessionDocument,parseSessionDocument};
