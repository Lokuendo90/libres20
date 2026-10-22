'use strict';
// Gravity Shields: protección de solicitudes, diseñada para privacidad local.
// Subconjunto conservador de filtros ABP basado en dominios. NO reemplaza a un antivirus.
const fs=require('node:fs');
const path=require('node:path');
const https=require('node:https');
const {randomUUID}=require('node:crypto');
const {parseAdvancedRule,parseCosmeticRule,compileExtendedRules,createCosmeticIndex}=require('./abp-extended.cjs');

const CORE_DOMAINS=Object.freeze([
  'doubleclick.net','googlesyndication.com','googleadservices.com','adservice.google.com',
  'google-analytics.com','analytics.google.com','googletagmanager.com','googletagservices.com',
  '2mdn.net','adnxs.com','adsrvr.org','rubiconproject.com','openx.net','pubmatic.com',
  'criteo.com','criteo.net','taboola.com','outbrain.com','revcontent.com',
  'smartadserver.com','casalemedia.com','indexww.com','advertising.com','yieldmo.com',
  'media.net','contextweb.com','sovrn.com','lijit.com','sharethrough.com',
  'triplelift.com','bidswitch.net','rlcdn.com','demdex.net','everesttech.net',
  'quantserve.com','scorecardresearch.com','chartbeat.com','hotjar.com','fullstory.com',
  'clarity.ms','mouseflow.com','luckyorange.com','segment.io','segment.com',
  'mixpanel.com','amplitude.com','heap.io','newrelic.com','branch.io',
  'appsflyer.com','adjust.com','branchmetrics.io','analytics.tiktok.com','ads-twitter.com',
  'facebook.net','connect.facebook.net','bat.bing.com','bingads.microsoft.com',
  'pixel.wp.com','stats.wp.com','static.hotjar.com','script.hotjar.com',
  'adroll.com','adroll.net','sitescout.com','districtm.io','zemanta.com',
  'mgid.com','propellerads.com','popads.net','popcash.net','exoclick.com'
]);
const FILTER_SOURCES=Object.freeze([
  'https://easylist.to/easylist/easylist.txt',
  'https://easylist.to/easylist/easyprivacy.txt'
]);
const MAX_FILTER_BYTES=20*1024*1024;
const MAX_CACHE_BYTES=64*1024*1024;
// Cobertura básica sin red: los filtros externos amplían este mínimo.
// Nunca bloquear googlevideo.com ni /youtubei/v1/player: son también la reproducción normal.
const BUILTIN_NETWORK_PATTERNS=Object.freeze([
  '||youtube.com/pagead/', '||youtube.com/api/stats/ads',
  '||google.com/pagead/ads', '/adsbygoogle.js', '/prebid.js',
  '/prebid/', '/advertisement/serve', '/gpt.js', '/googletagservices/',
  '||googlesyndication.com/pagead/', '||googleadservices.com/pagead/'
]);
const MAX_RULES=105000;
const RESOURCE_MAP=Object.freeze({xmlhttprequest:'xhr',subdocument:'subFrame',stylesheet:'stylesheet',script:'script',image:'image',media:'media',font:'font',websocket:'webSocket',ping:'ping'});
const ACCEPTED_FLAGS=new Set(['third-party','script','image','stylesheet','xmlhttprequest','subdocument','media','font','ping','websocket']);

function hostname(value){
  try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.hostname.toLowerCase().replace(/\.$/,''):''}
  catch{return ''}
}
function matchesDomain(host,domain){return host===domain||host.endsWith('.'+domain)}
function thirdParty(url,firstPartyURL){
  const host=hostname(url),site=hostname(firstPartyURL);
  if(!host||!site)return false; // Sin origen suficiente, no romper la solicitud.
  if(matchesDomain(host,site)||matchesDomain(site,host))return false;
  // Subdominios del mismo dominio registrable no se tratan como ajenos.
  // Esta aproximación es conservadora, NO sustituye a la Public Suffix List.
  const hostParts=host.split('.'),siteParts=site.split('.');
  const publicSecondLevel=new Set(['co.uk','org.uk','gov.uk','com.au','com.br','com.pe','com.mx','com.ar','co.jp','co.kr','co.in','com.co','com.cn']);
  function siteKey(parts){const suffix=parts.slice(-2).join('.');return parts.slice(-(publicSecondLevel.has(suffix)?3:2)).join('.');}
  if(hostParts.length>=2&&siteParts.length>=2&&siteKey(hostParts)===siteKey(siteParts))return false;
  return true;
}
function parseRule(line){
  const raw=String(line||'').trim();
  if(!raw||raw.startsWith('!')||raw.startsWith('[')||raw.startsWith('#')||raw.includes('##')||raw.includes('#@#'))return null;
  const allow=raw.startsWith('@@'),input=allow?raw.slice(2):raw;
  const m=/^\|\|([A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63})+)\^(?:\$([\w,~-]+))?$/.exec(input);
  if(!m)return null;
  const domain=m[1].toLowerCase();
  if(domain.length>253||domain.startsWith('-')||domain.endsWith('-'))return null;
  const flags=m[2]?m[2].split(','):[];
  if(flags.some(f=>!ACCEPTED_FLAGS.has(f)))return null; // Nunca ignorar opciones ABP no soportadas.
  const types=flags.filter(f=>Object.hasOwn(RESOURCE_MAP,f)).map(f=>RESOURCE_MAP[f]);
  return {domain,allow,thirdPartyOnly:flags.includes('third-party'),types};
}
function parseList(text,limit=MAX_RULES){
  if(typeof text!=='string'||Buffer.byteLength(text,'utf8')>MAX_FILTER_BYTES)throw Error('La lista de filtros supera el tamaño permitido');
  const rules=[],seen=new Set();
  for(const line of text.split(/\r?\n/)){
    const rule=parseRule(line)||parseCosmeticRule(line)||parseAdvancedRule(line);if(!rule)continue;
    const key=JSON.stringify(rule);if(seen.has(key))continue;
    seen.add(key);rules.push(rule);
    if(rules.length>=limit)break;
  }
  return rules;
}
function readRules(filepath){
  try{
    if(fs.statSync(filepath).size>MAX_CACHE_BYTES)return [];
    const json=JSON.parse(fs.readFileSync(filepath,'utf8'));
    if(![1,2].includes(json.version)||!Array.isArray(json.rules)||json.rules.length>MAX_RULES)return [];
    return json.rules.filter(rule=>{
      if(!rule||typeof rule!=='object'||typeof rule.allow!=='boolean')return false;
      if(rule.kind==='cosmetic'){
        const prefix=(rule.included||[]).concat((rule.excluded||[]).map(x=>'~'+x)).join(',');
        const verified=parseCosmeticRule(prefix+(rule.allow?'#@#':'##')+rule.selector);
        return Boolean(verified&&JSON.stringify(rule)===JSON.stringify(verified));
      }
      if(rule.kind==='pattern'){
        if(typeof rule.pattern!=='string'||rule.pattern.length>350||!Array.isArray(rule.types)||!Array.isArray(rule.excludedTypes))return false;
        const rebuilt=parseAdvancedRule((rule.allow?'@@':'')+rule.pattern+
          (rule.thirdPartyOnly||rule.firstPartyOnly||rule.types.length||rule.excludedTypes.length||rule.included?.length||rule.excluded?.length||rule.important||rule.matchCase ?
           '$'+[rule.thirdPartyOnly?'third-party':null,rule.firstPartyOnly?'~third-party':null,
           ...rule.types.map(t=>Object.keys(RESOURCE_MAP).find(k=>RESOURCE_MAP[k]===t)||''),
           ...rule.excludedTypes.map(t=>'~'+(Object.keys(RESOURCE_MAP).find(k=>RESOURCE_MAP[k]===t)||'')),
           (rule.included?.length||rule.excluded?.length)?'domain='+[...rule.included,...rule.excluded.map(x=>'~'+x)].join('|'):null,
           rule.important?'important':null,rule.matchCase?'match-case':null].filter(Boolean).join(',') : ''));
        return Boolean(rebuilt&&JSON.stringify(rebuilt)===JSON.stringify(rule));
      }
      return typeof rule.domain==='string'&&/^[a-z0-9.-]{3,253}$/.test(rule.domain)&&
        typeof rule.thirdPartyOnly==='boolean'&&Array.isArray(rule.types)&&rule.types.length<10;
    });
  }catch{return []}
}
function saveRules(filepath,rules){
  if(!Array.isArray(rules)||rules.length>MAX_RULES)throw Error('Demasiados filtros');
  const body=JSON.stringify({version:2,updated:new Date().toISOString(),rules});
  if(Buffer.byteLength(body,'utf8')>MAX_CACHE_BYTES)throw Error('Filtros demasiado grandes');
  fs.mkdirSync(path.dirname(filepath),{recursive:true});
  const temp=filepath+'.'+randomUUID()+'.tmp';
  try{fs.writeFileSync(temp,body,{encoding:'utf8',mode:0o600,flag:'wx'});fs.renameSync(temp,filepath)}
  finally{try{fs.unlinkSync(temp)}catch{}}
}
function createShields({rules=[],enabled=()=>true,excepted=()=>false,blockCrossSiteCookies=()=>true,onBlocked=()=>{}}={}){
  let extra=Array.isArray(rules)?rules.slice(0,MAX_RULES):[];
  let index=new Map(),advanced=compileExtendedRules([]),cosmetic=createCosmeticIndex([]);
  function rebuild(){
    index=new Map();
    advanced=compileExtendedRules([...BUILTIN_NETWORK_PATTERNS.map(parseAdvancedRule).filter(Boolean),
      ...extra.filter(rule=>rule?.kind==='pattern')]);
    cosmetic=createCosmeticIndex(extra.filter(rule=>rule?.kind==='cosmetic'));
    for(const rule of extra){
      if(!rule||rule.kind||typeof rule.domain!=='string')continue;
      const group=index.get(rule.domain)||[];group.push(rule);index.set(rule.domain,group);
    }
  }
  rebuild();
  function ruleMatch(host,type,isThird){
    const parts=host.split('.');let block=false,allow=false;
    for(let i=0;i<parts.length-1;i++){
      const domain=parts.slice(i).join('.');
      for(const rule of index.get(domain)||[]){
        if(rule.thirdPartyOnly&&!isThird)continue;
        if(rule.types.length&&!rule.types.includes(type))continue;
        if(rule.allow)allow=true;else block=true;
      }
    }
    return {allow,block};
  }
  function shouldBlock(details,firstPartyURL){
    if(!enabled()||details.resourceType==='mainFrame'||excepted(firstPartyURL))return false;
    const host=hostname(details.url),isThird=thirdParty(details.url,firstPartyURL);
    if(!host)return false;
    const match=ruleMatch(host,details.resourceType,isThird);
    const newMatch=advanced.evaluate(details.url,details.resourceType,isThird,firstPartyURL);
    const blocked=(newMatch.important||(!match.allow&&!newMatch.allow))&&
      (match.block||newMatch.block||(isThird&&CORE_DOMAINS.some(domain=>matchesDomain(host,domain))));
    if(blocked)onBlocked(details);
    return blocked;
  }
  function requestHeaders(details,firstPartyURL){
    if(excepted(firstPartyURL))return {requestHeaders:details.requestHeaders};
    const headers={...details.requestHeaders};
    if(enabled()){headers['DNT']='1';headers['Sec-GPC']='1';}
    if(blockCrossSiteCookies()&&thirdParty(details.url,firstPartyURL)){
      for(const key of Object.keys(headers))if(key.toLowerCase()==='cookie')delete headers[key];
    }
    return {requestHeaders:headers};
  }
  function responseHeaders(details,firstPartyURL){
    if(!blockCrossSiteCookies()||excepted(firstPartyURL)||!thirdParty(details.url,firstPartyURL))
      return {responseHeaders:details.responseHeaders};
    const headers={...details.responseHeaders};
    for(const key of Object.keys(headers))if(key.toLowerCase()==='set-cookie'||key.toLowerCase()==='set-cookie2')delete headers[key];
    return {responseHeaders:headers};
  }
  return {shouldBlock,requestHeaders,responseHeaders,cosmeticCssFor:url=>cosmetic.cssFor(url),
    replaceRules(newRules){extra=newRules.slice(0,MAX_RULES);rebuild()},rulesCount:()=>extra.length+CORE_DOMAINS.length+BUILTIN_NETWORK_PATTERNS.length,
    ruleStats:()=>({total:extra.length+CORE_DOMAINS.length+BUILTIN_NETWORK_PATTERNS.length,advanced:advanced.size,cosmetic:cosmetic.size})};
}
function fetchText(url,redirects=1){
  return new Promise((resolve,reject)=>{
    const parsed=new URL(url);
    if(parsed.protocol!=='https:'||!['easylist.to','easylist-downloads.adblockplus.org'].includes(parsed.hostname))return reject(Error('Fuente de filtros no autorizada'));
    const req=https.get(parsed,{timeout:12000,headers:{'User-Agent':'Gravity-FilterLists/1.0','Accept-Encoding':'identity'}},resp=>{
      if([301,302,307,308].includes(resp.statusCode)&&resp.headers.location&&redirects>0){
        resp.resume();try{return resolve(fetchText(new URL(resp.headers.location,url).href,redirects-1))}catch(e){return reject(e)}
      }
      if(resp.statusCode!==200){resp.resume();return reject(Error(`No se pudo descargar una lista (HTTP ${resp.statusCode})`))}
      let size=0;const chunks=[];
      resp.on('data',chunk=>{size+=chunk.length;if(size>MAX_FILTER_BYTES){req.destroy(Error('Lista de filtros demasiado grande'));return}chunks.push(chunk)});
      resp.on('end',()=>resolve(Buffer.concat(chunks).toString('utf8')));
      resp.on('error',reject);
    });
    req.on('timeout',()=>req.destroy(Error('Tiempo de descarga de filtros agotado')));
    req.on('error',reject);
  });
}
async function downloadLists(fetcher=fetchText){
  // Descarga EXPLÍCITA: no se transmite navegación a Gravity ni se consulta al teclear.
  const responses=await Promise.all(FILTER_SOURCES.map(source=>fetcher(source)));
  const parsed=responses.flatMap(text=>parseList(text));
  if(parsed.length<100)throw Error('Las listas descargadas no contienen suficientes reglas compatibles. No se reemplazaron las reglas anteriores.');
  const uniques=new Map();
  for(const rule of parsed){uniques.set(JSON.stringify(rule),rule);if(uniques.size>=MAX_RULES)break}
  return [...uniques.values()];
}
module.exports={CORE_DOMAINS,FILTER_SOURCES,parseRule,parseList,thirdParty,hostname,createShields,readRules,saveRules,downloadLists};
