'use strict';
// Motor de reglas ABP *parcial*: rutas, comodines, tipos de recursos, condiciones de sitio
// y selectores cosméticos simples. No ejecuta scriptlets ni expresiones regulares arbitrarias.
// Implementación original de Gravity; NO se presenta como uBlock/Brave equivalente.
const TYPE_MAP=Object.freeze({xmlhttprequest:'xhr',subdocument:'subFrame',stylesheet:'stylesheet',script:'script',image:'image',media:'media',font:'font',websocket:'webSocket',ping:'ping',object:'object',other:'other'});
const DOMAIN_RE=/^[a-z\d](?:[a-z\d.-]{0,251}[a-z\d])?$/i;
const MAX_PATTERN_LENGTH=350;
const MAX_SELECTOR_LENGTH=360;
function hostMatches(host,domain){return !!host&&(host===domain||host.endsWith('.'+domain));}
function hostFromURL(value){try{const u=new URL(value);return /^https?:$/.test(u.protocol)?u.hostname.toLowerCase():''}catch{return '';}}
function safeDomain(domain){return typeof domain==='string'&&domain.length>=3&&domain.length<=253&&DOMAIN_RE.test(domain)&&!domain.includes('..')&&!domain.startsWith('.');}
function parseAdvancedRule(rawLine){
  let line=String(rawLine||'').trim();
  if(!line||line[0]==='!'||line[0]==='['||line.includes('##')||line.includes('#@#')||line.includes('#?#')||line.includes('#$#')||line.includes('#%#'))return null;
  const allow=line.startsWith('@@');if(allow)line=line.slice(2);
  let options='';const at=line.lastIndexOf('$');
  if(at>=0){options=line.slice(at+1);line=line.slice(0,at);}
  if(line.length<5||line.length>MAX_PATTERN_LENGTH||(line.match(/\*/g)||[]).length>7||/[\r\n\0]/.test(line)||(/^\/.+\/$/.test(line)))return null;
  const included=[],excluded=[],types=[],excludedTypes=[];
  let thirdPartyOnly=false,firstPartyOnly=false,important=false,matchCase=false;
  if(options){
    for(const flag of options.split(',')){
      if(flag==='third-party'){thirdPartyOnly=true;continue;}
      if(flag==='~third-party'){firstPartyOnly=true;continue;}
      if(flag==='match-case'){matchCase=true;continue;}
      if(flag==='important'){important=true;continue;}
      if(flag.startsWith('domain=')){
        const domains=flag.slice(7).split('|');
        if(!domains.length||domains.length>40)return null;
        for(const item of domains){const negative=item.startsWith('~'),d=(negative?item.slice(1):item).toLowerCase();
          if(!safeDomain(d))return null;(negative?excluded:included).push(d);}
        continue;
      }
      const neg=flag.startsWith('~'),type=TYPE_MAP[neg?flag.slice(1):flag];
      if(type){(neg?excludedTypes:types).push(type);continue;}
      // Desconocida: ignorar la regla completa para no ampliar inadvertidamente el bloqueo.
      return null;
    }
  }
  if(firstPartyOnly&&thirdPartyOnly)return null;
  const anchored=/^\|\|([a-z\d][a-z\d.-]*)(?=[\^\/\?\*\|]|$)/i.exec(line);
  const domain=anchored?.[1]?.toLowerCase()||'';
  if(domain&&!safeDomain(domain))return null;
  // Evita filtros sin una parte literal útil; en particular patrones como ******.
  const literal=line.replace(/[\|\^\*]/g,'');if(literal.length<5)return null;
  return {kind:'pattern',pattern:line,domain,allow,thirdPartyOnly,firstPartyOnly,types,excludedTypes,included,excluded,important,matchCase};
}
function parseCosmeticRule(rawLine){
  const line=String(rawLine||'').trim();
  const splitAt=line.indexOf('#@#')>=0?line.indexOf('#@#'):line.indexOf('##');
  if(splitAt<0||line.includes('#?#')||line.includes('#$#')||line.includes('#%#'))return null;
  const allow=line.substring(splitAt,splitAt+3)==='#@#';
  const prefix=line.slice(0,splitAt),selector=line.slice(splitAt+(allow?3:2)).trim();
  if(!selector||selector.length>MAX_SELECTOR_LENGTH||/[{}<>\r\n@]/.test(selector)||/\b(?:url\s*\(|expression\s*\(|@import|javascript:)/i.test(selector))return null;
  if(/^(?:html|body|\*|:root)(?:\s|$|:)/i.test(selector))return null;
  // Exclusión preventiva de pseudo-scriptlets, selectores extendidos y fugas por CSS url().
  if(/:style\(|:remove\(|:xpath\(|:matches-css\(|:has-text\(/i.test(selector))return null;
  const included=[],excluded=[];
  if(prefix){
    const items=prefix.split(',');if(items.length>24)return null;
    for(const entry of items){const neg=entry.startsWith('~');const domain=(neg?entry.slice(1):entry).toLowerCase();
      if(!safeDomain(domain))return null;(neg?excluded:included).push(domain);}
  }
  return {kind:'cosmetic',selector,allow,included,excluded};
}
function matchesDomainConstraints(host,included,excluded){
  if(excluded?.some(d=>hostMatches(host,d)))return false;
  return !included?.length||included.some(d=>hostMatches(host,d));
}
const esc=str=>str.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function abpToRegex(rule){
  const raw=rule.pattern;
  let anchorStart=false,anchorEnd=false,domainPart='';let input=raw;
  if(input.startsWith('||')){const m=/^\|\|([a-z\d][a-z\d.-]*)(.*)$/i.exec(input);if(!m)return null;
    domainPart=m[1];input=m[2];anchorStart=true;
  }else if(input.startsWith('|')){anchorStart=true;input=input.slice(1);}
  if(input.endsWith('|')){anchorEnd=true;input=input.slice(0,-1);}
  const convert=str=>str.split('').map(c=>c==='*'?'.*':c==='^'?'(?:[^a-zA-Z0-9_\\-.%]|$)':esc(c)).join('');
  const source=domainPart?
    '^[a-z][a-z\\d+.-]*:\\/\\/(?:[^/?#]*\\.)?'+esc(domainPart)+convert(input):
    (anchorStart?'^':'')+convert(input)+(anchorEnd?'$':'');
  try{return new RegExp(source,rule.matchCase?'':'i');}catch{return null;}
}
function compileRule(rule){const regex=abpToRegex(rule);if(!regex)return null;
  return {...rule,regex,token:rule.domain?'':chooseToken(rule.pattern,rule.matchCase)};}
function chooseToken(pattern,matchCase){
  const fragments=pattern.replace(/^\|\|/,'').split(/[\*\^\|]/).filter(x=>x.length>=5);
  fragments.sort((a,b)=>b.length-a.length);
  // Los tokens deben estar en la URL para evitar evaluar miles de expresiones por solicitud.
  return (fragments[0]||'').slice(0,70)[matchCase?'toString':'toLowerCase']();
}
function compileExtendedRules(rules){
  const byDomain=new Map(),byToken=new Map(),unindexed=[];
  for(const rule of rules){const compiled=compileRule(rule);if(!compiled)continue;
    if(compiled.domain){const arr=byDomain.get(compiled.domain)||[];arr.push(compiled);byDomain.set(compiled.domain,arr);continue;}
    if(compiled.token.length>=5){const key=compiled.token.slice(0,4).toLowerCase();const arr=byToken.get(key)||[];arr.push(compiled);byToken.set(key,arr);}
    else unindexed.push(compiled);
  }
  function evaluate(url,resourceType,isThird,firstPartyURL){
    const host=hostFromURL(url),site=hostFromURL(firstPartyURL),result={allow:false,block:false,important:false};
    if(!host)return result;
    const seen=new Set(),matches=[];
    const parts=host.split('.');for(let i=0;i<parts.length-1;i++)matches.push(...(byDomain.get(parts.slice(i).join('.'))||[]));
    // Mapear cada tetragrama del URL evita recorrer linealmente miles de filtros genéricos.
    const lower=url.toLowerCase();const seenKeys=new Set();
    for(let i=0;i<lower.length-3;i++){const key=lower.slice(i,i+4);if(seenKeys.has(key))continue;seenKeys.add(key);matches.push(...(byToken.get(key)||[]));}
    matches.push(...unindexed);
    for(const rule of matches){if(seen.has(rule))continue;seen.add(rule);
      if(rule.thirdPartyOnly&&!isThird||rule.firstPartyOnly&&isThird)continue;
      if(rule.types.length&&!rule.types.includes(resourceType)||rule.excludedTypes.includes(resourceType))continue;
      if(!matchesDomainConstraints(site,rule.included,rule.excluded))continue;
      if(rule.token&&!url.toLowerCase().includes(rule.token.toLowerCase()))continue;
      if(!rule.regex.test(url))continue;
      if(rule.allow)result.allow=true;else{result.block=true;if(rule.important)result.important=true;}
    }
    return result;
  }
  return {evaluate,size:[...byDomain.values()].reduce((n,a)=>n+a.length,0)+[...byToken.values()].reduce((n,a)=>n+a.length,0)+unindexed.length};
}
function createCosmeticIndex(rules){
  // Como las reglas cosméticas son solo selectores estáticos, nunca se ejecuta JavaScript de terceros.
  const cached=new Map();let global=[],siteSpecific=[];
  for(const rule of rules){if(rule.included.length)siteSpecific.push(rule);else global.push(rule);}
  function cssFor(url){
    const host=hostFromURL(url);if(!host)return '';
    if(cached.has(host))return cached.get(host);
    const blocked=new Set(),excepted=new Set();
    for(const rule of [...global,...siteSpecific]){
      if(!matchesDomainConstraints(host,rule.included,rule.excluded))continue;
      (rule.allow?excepted:blocked).add(rule.selector);
    }
    const safe=[...blocked].filter(sel=>!excepted.has(sel)).slice(0,1600);
    const css=safe.map(sel=>`${sel}{display:none !important;}`).join('\n').slice(0,170000);
    if(cached.size>50)cached.clear();cached.set(host,css);
    return css;
  }
  return {cssFor,size:rules.length};
}
module.exports={parseAdvancedRule,parseCosmeticRule,compileExtendedRules,createCosmeticIndex,abpToRegex};
