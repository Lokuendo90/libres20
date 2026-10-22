'use strict';
// Canal de actualizaciones embebido en el instalador y no editable por sitios web.
// Sin un editor real, instalador firmado y host HTTPS propio, el canal queda DESACTIVADO.
const net=require('node:net');
function validateChannel(config, context={}) {
  if(!config || config.enabled!==true)return {ready:false,reason:'El canal oficial todavía no está activado.'};
  if(context.platform!=='win32'||context.isPackaged!==true)return {ready:false,reason:'Disponible únicamente en la aplicación Windows empaquetada.'};
  if(config.version!==1||config.channel!=='stable')return {ready:false,reason:'Configuración de canal no válida.'};
  const publisher=typeof config.expectedPublisher==='string'?config.expectedPublisher.trim():'';
  if(publisher.length<5||publisher.length>200||publisher!==String(context.builderPublisher||'').trim())
    return {ready:false,reason:'No hay identidad de firmante coincidente con el instalador.'};
  let url;
  try{url=new URL(config.feedUrl);}catch{return {ready:false,reason:'Falta la dirección HTTPS del servicio oficial.'};}
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.port&&url.port!=='443'||
     net.isIP(url.hostname)||url.hostname==='localhost'||!url.hostname.includes('.')||
     url.hostname.endsWith('.example')||url.hostname.endsWith('.invalid')||url.hostname.endsWith('.test')||
     url.hostname.endsWith('.local')||!url.pathname.endsWith('/'))
    return {ready:false,reason:'El origen de actualizaciones debe ser HTTPS público, sin credenciales ni redirecciones configuradas.'};
  return {ready:true,url:url.href,expectedPublisher:publisher};
}
function validatePublishSettings(publish,channel){
  const providers=Array.isArray(publish)?publish:[];
  if(!channel?.enabled)return providers.length===0;
  if(providers.length!==1)return false;
  const p=providers[0];
  return p?.provider==='generic'&&p.url===channel.feedUrl;
}
module.exports={validateChannel,validatePublishSettings};
