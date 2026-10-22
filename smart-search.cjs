'use strict';
// Solo navegación explícita a dominios conocidos. No consulta servidores de sugerencias.
const KNOWN=Object.freeze([
  ['youtube','https://www.youtube.com/'],['yt','https://www.youtube.com/'],
  ['facebook','https://www.facebook.com/'],['instagram','https://www.instagram.com/'],
  ['whatsapp','https://web.whatsapp.com/'],['whatsapp web','https://web.whatsapp.com/'],
  ['gmail','https://mail.google.com/'],['google','https://www.google.com/'],
  ['google maps','https://maps.google.com/'],['maps','https://maps.google.com/'],
  ['google drive','https://drive.google.com/'],['drive','https://drive.google.com/'],
  ['google docs','https://docs.google.com/'],['docs','https://docs.google.com/'],
  ['google meet','https://meet.google.com/'],['meet','https://meet.google.com/'],
  ['reddit','https://www.reddit.com/'],['wikipedia','https://www.wikipedia.org/'],
  ['twitter','https://x.com/'],['x twitter','https://x.com/'],
  ['tiktok','https://www.tiktok.com/'],['netflix','https://www.netflix.com/'],
  ['amazon','https://www.amazon.com/'],['github','https://github.com/'],
  ['gitlab','https://gitlab.com/'],['stackoverflow','https://stackoverflow.com/'],
  ['chatgpt','https://chatgpt.com/'],['openai','https://openai.com/'],
  ['spotify','https://open.spotify.com/'],['twitch','https://www.twitch.tv/'],
  ['linkedin','https://www.linkedin.com/'],['pinterest','https://www.pinterest.com/'],
  ['discord','https://discord.com/app'],['telegram','https://web.telegram.org/'],
  ['canva','https://www.canva.com/'],['notion','https://www.notion.so/'],
  ['figma','https://www.figma.com/'],['zoom','https://zoom.us/'],
  ['microsoft','https://www.microsoft.com/'],['outlook','https://outlook.live.com/'],
  ['office','https://www.office.com/'],['onedrive','https://onedrive.live.com/'],
  ['dropbox','https://www.dropbox.com/'],['bing','https://www.bing.com/'],
  ['duckduckgo','https://duckduckgo.com/'],['ebay','https://www.ebay.com/']
]);
function normalAlias(q){return String(q||'').trim().toLocaleLowerCase('es').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ')}
const INDEX=new Map(KNOWN.map(([name,url])=>[normalAlias(name),url]));
function directSite(query){return INDEX.get(normalAlias(query))||''}
function knownSuggestions(query,limit=5){
  const q=normalAlias(query);if(q.length<2)return [];
  return KNOWN.filter(([name])=>normalAlias(name).startsWith(q)).slice(0,limit).map(([name,url])=>({title:name[0].toUpperCase()+name.slice(1),url,source:'sitio conocido'}));
}
function localSuggestions(query,bookmarks=[],history=[],limit=8){
  const q=normalAlias(query);if(q.length<2)return [];
  const candidates=[...knownSuggestions(query,4).map(x=>({...x,score:50})),
    ...bookmarks.map(x=>({...x,source:'favorito',score:70})),
    ...history.map((x,i)=>({...x,source:'historial',score:Math.max(10,45-i/10)}))];
  const seen=new Set();
  return candidates.filter(x=>{
    if(typeof x.url!=='string'||!x.url.startsWith('https://')&&!x.url.startsWith('http://'))return false;
    if(!normalAlias(x.title+' '+x.url).includes(q))return false;
    if(seen.has(x.url))return false;seen.add(x.url);return true;
  }).sort((a,b)=>b.score-a.score).slice(0,limit).map(({title,url,source})=>({title,url,source}));
}
module.exports={KNOWN,normalAlias,directSite,knownSuggestions,localSuggestions};
