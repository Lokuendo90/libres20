'use strict';
// Ahorro de memoria CONSERVADOR: siempre apagado hasta que el usuario lo active.
// No garantiza detectar todos los formularios SPA; nunca se activa por defecto.
const INACTIVITY_MS = 30 * 60 * 1000;
const MAX_PER_SWEEP = 2;
const PROTECTED_HOSTS = [
  'youtube.com','youtu.be','mail.google.com','meet.google.com','docs.google.com',
  'drive.google.com','web.whatsapp.com','whatsapp.com','teams.microsoft.com',
  'office.com','office365.com','outlook.com','figma.com','notion.so','slack.com',
  'discord.com','twitch.tv','netflix.com'
];
function protectedHost(raw){
  try {
    const url = new URL(raw);
    if(url.protocol !== 'https:' && url.protocol !== 'http:')return true;
    const host=url.hostname.toLowerCase();
    return PROTECTED_HOSTS.some(item=>host===item || host.endsWith('.'+item));
  } catch { return true; }
}
function eligible(tab, currentId, busyIds, now=Date.now()){
  if(!tab||tab.id===currentId||tab.private||tab.pinned||tab.lazy||tab.loading||tab.error||tab.audible||tab.viewCorrupted)return false;
  if(protectedHost(tab.url)||!tab.view?.webContents)return false;
  if(now-(tab.lastActivatedAt||now)<INACTIVITY_MS)return false;
  const wc=tab.view.webContents;
  if(wc.isDestroyed?.()||busyIds.has(wc.id))return false;
  try{if(wc.isCurrentlyAudible?.()||wc.isDevToolsOpened?.())return false}catch{return false}
  return true;
}
// Solo devuelve un booleano; nunca datos de páginas o formularios al proceso principal.
// Rechaza preventivamente cualquier página con formularios, multimedia o áreas editables.
const SAFE_TO_SUSPEND_SCRIPT = `(() => {
  try {
    if (document.visibilityState !== 'hidden') return false;
    if (document.querySelector('input,textarea,select,[contenteditable],video,audio,canvas,iframe')) return false;
    if (document.activeElement && document.activeElement.isContentEditable) return false;
    return true;
  } catch { return false; }
})()`;
async function safeToSuspend(wc,timeoutMs=1800){
  let timer;
  try{
    return (await Promise.race([
      Promise.resolve(wc.executeJavaScript(SAFE_TO_SUSPEND_SCRIPT,true)),
      new Promise(resolve=>{timer=setTimeout(()=>resolve(false),timeoutMs);timer.unref?.()})
    ])) === true;
  }catch{return false}
  finally{clearTimeout(timer)}
}
function sampleProcessMetrics(metrics){
  if(!Array.isArray(metrics))return {memoryMB:null,cpuPercent:null,processes:0};
  let kb=0,cpu=0,ramCount=0,cpuCount=0;
  for(const entry of metrics){
    const ram=entry?.memory?.workingSetSize;
    const usage=entry?.cpu?.percentCPUUsage;
    if(Number.isFinite(ram)&&ram>=0){kb+=ram;ramCount++}
    if(Number.isFinite(usage)&&usage>=0){cpu+=usage;cpuCount++}
  }
  return {
    memoryMB:ramCount?Math.round(kb/1024):null,
    cpuPercent:cpuCount?Math.round(cpu*10)/10:null,
    processes:metrics.length
  };
}
module.exports={INACTIVITY_MS,MAX_PER_SWEEP,PROTECTED_HOSTS,protectedHost,eligible,safeToSuspend,SAFE_TO_SUSPEND_SCRIPT,sampleProcessMetrics};
