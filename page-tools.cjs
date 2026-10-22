'use strict';
// Operaciones auxiliares de lectura, traducción y captura sin dependencias externas.
const MAX_READER_CHARS=180000;
function translationLink(url,language='es'){
  const u=new URL(url);
  if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error('Solo páginas HTTP(S) sin credenciales');
  if(!['es','en','fr','pt','de','it'].includes(language))throw Error('Idioma de traducción no permitido');
  return `https://translate.google.com/translate?sl=auto&tl=${language}&u=${encodeURIComponent(u.href)}`;
}
const READER_SCRIPT=`(() => {
  const article=document.querySelector('article')||document.querySelector('main')||document.querySelector('[role="main"]')||document.body;
  if(!article) return {title:document.title||'Artículo',paragraphs:[]};
  const candidates=[...article.querySelectorAll('h1,h2,h3,p,blockquote,li')].slice(0,2400);
  const paragraphs=[];let length=0;
  for(const node of candidates){
    if(node.closest('nav,aside,footer,header,script,style,[aria-hidden="true"],form'))continue;
    const line=(node.innerText||node.textContent||'').replace(/\\s+/g,' ').trim();
    if(line.length<25||line.length>5000)continue;
    if(length+line.length>180000)break;
    paragraphs.push({kind:/^H[123]$/.test(node.tagName)?'heading':'text',value:line});length+=line.length;
  }
  return {title:String(document.title||'Lectura').slice(0,220),paragraphs};
})()`;
function validateReader(data){
  if(!data||!Array.isArray(data.paragraphs))throw Error('La página no contiene contenido de lectura compatible');
  const paragraphs=[];let length=0;
  for(const row of data.paragraphs.slice(0,2400)){
    if(typeof row?.value!=='string')continue;
    const value=row.value.slice(0,5000);if(value.length<20)continue;
    if(length+value.length>MAX_READER_CHARS)break;
    paragraphs.push({kind:row.kind==='heading'?'heading':'text',value});length+=value.length;
  }
  if(!paragraphs.length)throw Error('No se encontró un artículo legible en esta página');
  return {title:String(data.title||'Lectura').slice(0,220),paragraphs};
}
function cropRect(raw,width,height){
  const [x,y,w,h]=[raw?.x,raw?.y,raw?.width,raw?.height].map(Number);
  if(![x,y,w,h,width,height].every(Number.isFinite)||w<8||h<8||x<0||y<0||width<=0||height<=0||x+w>width+0.01||y+h>height+0.01)
    throw Error('Área de recorte inválida');
  return {x:Math.floor(x),y:Math.floor(y),width:Math.floor(w),height:Math.floor(h)};
}
module.exports={translationLink,READER_SCRIPT,validateReader,cropRect};
