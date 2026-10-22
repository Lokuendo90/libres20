'use strict';
// Importación HTML Netscape sin scripts, URLs locales ni exportaciones parciales silenciosas.
const MAX_BOOKMARK_FILE_BYTES = 16 * 1024 * 1024;
const MAX_BOOKMARKS = 20000;

function webAddress(value) {
  try {
    const url = new URL(String(value).trim());
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    if (url.username || url.password) return '';
    return url.href;
  } catch { return ''; }
}
function decodeEntities(input) {
  const entities={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',sol:'/'};
  return String(input).replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp|sol);?/gi, (_match, token) => {
    if (token[0] === '#') {
      const hex=token[1]?.toLowerCase()==='x';
      const point=Number.parseInt(token.slice(hex?2:1),hex?16:10);
      return Number.isInteger(point)&&point>0&&point<=0x10ffff&&!(point>=0xd800&&point<=0xdfff)
        ? String.fromCodePoint(point) : '\ufffd';
    }
    return entities[token.toLowerCase()]||_match;
  });
}
function cleanTitle(value, url) {
  const title=decodeEntities(String(value).replace(/<[^>]*>/g,'')).replace(/[\x00-\x1f\x7f]/g,' ').replace(/\s+/g,' ').trim().slice(0,240);
  return title || new URL(url).hostname;
}
function parseBookmarksHTML(html,limit=MAX_BOOKMARKS) {
  if (typeof html!=='string'||Buffer.byteLength(html,'utf8')>MAX_BOOKMARK_FILE_BYTES)
    throw new Error('Archivo de favoritos demasiado grande o inválido (máximo 16 MB).');
  if (!/<(?:!doctype\s+netscape-bookmark-file|dl\b|a\b)/i.test(html))
    throw new Error('El archivo no parece contener favoritos HTML.');
  const result=[],seen=new Set();
  const re=/<a\b([^>]{0,4096})>([\s\S]{0,4096}?)<\/a\s*>/gi;
  let m;
  while ((m=re.exec(html))) {
    const href=/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(m[1]);
    if (!href) continue;
    const url=webAddress(decodeEntities(href[1]??href[2]??href[3]));
    if(!url||seen.has(url))continue;
    // Una importación más grande que el máximo falla íntegra, sin recortar el final.
    if(result.length>=limit)throw new Error(`El archivo supera ${limit} favoritos únicos. No se importó ningún favorito.`);
    seen.add(url);
    result.push({url,title:cleanTitle(m[2],url)});
  }
  return result;
}
function encodeEntities(value){
  return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function exportableBookmarks(items){
  return (Array.isArray(items)?items:[]).filter(item=>webAddress(item?.url));
}
function exportBookmarksHTML(items) {
  // NO slice() aquí. Un archivo de exportación debe contener todos los favoritos compatibles.
  const rows=[];
  for(const item of exportableBookmarks(items)){
    const url=webAddress(item.url);
    const title=typeof item.title==='string'&&item.title.trim()?item.title.slice(0,240):new URL(url).hostname;
    rows.push(`    <DT><A HREF="${encodeEntities(url)}">${encodeEntities(title)}</A>`);
  }
  return '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n'+
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n'+
    '<TITLE>Favoritos de Gravity</TITLE>\n<H1>Favoritos de Gravity</H1>\n<DL><p>\n'+
    rows.join('\n')+'\n</DL><p>\n';
}
function mergeBookmarks(existing,incoming,limit=MAX_BOOKMARKS){
  // Conservar hasta los perfiles anteriores que superen el límite actual.
  const retained=Array.isArray(existing)?existing.slice():[];
  const seen=new Set(retained.map(x=>x.url));let added=0;
  for(const item of incoming){
    const url=webAddress(item.url);
    if(!url||seen.has(url))continue;
    if(retained.length>=limit)
      throw new Error(`Has alcanzado el límite de ${limit} favoritos. No se realizó una importación parcial.`);
    retained.push({url,title:cleanTitle(String(item.title||''),url)});
    seen.add(url);added++;
  }
  return {items:retained,added};
}
module.exports={parseBookmarksHTML,exportBookmarksHTML,exportableBookmarks,mergeBookmarks,webAddress,MAX_BOOKMARK_FILE_BYTES,MAX_BOOKMARKS};
