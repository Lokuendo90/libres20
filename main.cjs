'use strict';
// Gravity 1.1.2 beta: Escudos de red/cosméticos ampliados y manejo de anuncios reconocibles de YouTube; diseño intacto.
const { app, BrowserWindow, WebContentsView, ipcMain, session, dialog, shell, Menu, clipboard, safeStorage, nativeImage } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const {Buffer}=require('node:buffer');
const { randomUUID } = require('node:crypto');
const {readProfile,writeProfile:atomicWriteProfile}=require('./profile-store.cjs');
const {parseBookmarksHTML,exportBookmarksHTML,exportableBookmarks,mergeBookmarks,MAX_BOOKMARK_FILE_BYTES,MAX_BOOKMARKS}=require('./bookmarks-io.cjs');
const {createPopupPolicy}=require('./popup-policy.cjs');
const {createPermissionGrants,permissionContext,safeOrigin,isAllowedWebNavigation,PERMISSIONS}=require('./security-policy.cjs');
const {createLocalDiagnostics}=require('./diagnostics.cjs');
const {makeCrashMarker}=require('./crash-recovery.cjs');
const {attachAudioStateListener}=require('./audio-state.cjs');
const {cleanDownloadFilename,isDangerousDownload,chooseDangerousDownload}=require('./download-safety.cjs');
const {createSessionDocument,parseSessionDocument,MAX_SESSION_BYTES}=require('./session-io.cjs');
const {sortedPinned,clampReorder,validateGroup,restoreMeta,cleanGroup}=require('./pro-tab-state.cjs');
const profiles=require('./profiles.cjs');
const {vault}=require('./credential-vault.cjs');
const {translationLink,READER_SCRIPT,validateReader,cropRect}=require('./page-tools.cjs');
const {requestPermissionContext,checkPermissionContext}=require('./permission-hardening.cjs');
const {eligible,safeToSuspend,protectedHost,MAX_PER_SWEEP,sampleProcessMetrics}=require('./tab-efficiency.cjs');
const {createUpdateService}=require('./update-service.cjs');
const {createHash}=require('node:crypto');
const {createShields,readRules,saveRules,downloadLists}=require('./privacy-shields.cjs');
const {directSite,localSuggestions}=require('./smart-search.cjs');
const {scanDownloadedFile}=require('./defender-scan.cjs');
const {assessWebsite}=require('./site-risk.cjs');
const {AD_CSS,canInject}=require('./ad-cosmetics.cjs');
const {shouldAllowFullscreen}=require('./fullscreen-policy.cjs');
const {installYouTubeContinuity,isYouTubeWatchUrl}=require('./youtube-continuity.cjs');
const {installYoutubeAdHandler,isYoutubeVideoPage}=require('./youtube-ad-handler.cjs');
const {shouldRefreshFilters,writeAttempt}=require('./filter-refresh.cjs');

const HOME = 'gravity://home';
const PROFILE_ROOT=path.join(app.getPath('appData'),'gravity-directo');
const SELECTED_PROFILE=profiles.selectedFromArgs(process.argv,PROFILE_ROOT);
const NORMAL_PARTITION=SELECTED_PROFILE.partition;
// Por defecto la ruta original y sus cookies permanecen INTACTAS.
// Los perfiles adicionales quedan en su propio directorio y partición de Chromium.
// app.setPath debe establecerse antes de que Electron quede listo.
function preserveLegacyProfilePath(){
  const destination=SELECTED_PROFILE.userData;
  if(path.resolve(app.getPath('userData'))!==path.resolve(destination)){
    fs.mkdirSync(destination,{recursive:true});
    app.setPath('userData',destination);
  }
}
preserveLegacyProfilePath();
const MAX_TABS = 30;
const MAX_HISTORY = 650;
const MAX_DOWNLOADS = 80;
const ENGINES = Object.freeze({
  google: q => `https://www.google.com/search?q=${encodeURIComponent(q)}`,
  duckduckgo: q => `https://duckduckgo.com/?q=${encodeURIComponent(q)}`,
  bing: q => `https://www.bing.com/search?q=${encodeURIComponent(q)}`
});
const DEFAULT_SETTINGS = {searchEngine:'google',restoreTabs:true,blockTrackers:true,trackerExceptions:[],
  blockThirdPartyCookies:true,autoUpdateFilterLists:true,clearSiteDataOnExit:false,askDownloadLocation:false,autoSleepTabs:false,shieldsMigratedV112:false};
let win = null;
let tabs = [];
let active = '';
let nextId = 1;
let top = 106;
let overlay = false;
let dataFile;
let writeTimer;
let privatePartition = `gravity-private-${randomUUID()}`;
let privateSessions = new Set();
const sessionHandlers=new Map();
const popupPolicy=createPopupPolicy();
let normalProfile = null;
let recoverySource='empty';
let log=null;
let crashMarker=null;
let previousUncleanExit=false;
let deferUI=false;
let uiRestartAttempted=false;
let closedTabs = [];
let allowedByPartition = new Map();
let downloads = [];
let downloadItems = new Map();
let downloadSeq = 0;
let downloadNotifyTime = 0;
let pendingStateSend=false;
let closingConfirmed=false;
let closeConfirmationPending=false;
const data = {restore:[],restoreActive:0,bookmarks:[],history:[],shortcuts:[],downloads:[],tabGroups:[],settings:{...DEFAULT_SETTINGS}};
let clipboardClearTimer;
let cropWindow=null;
let cropImage=null;
let vaultInstance=null;
let memorySweepRunning=false;
let memorySweepTimer=null;
let updateService=null;
let updateServiceStarted=false;
let shields=null;
let shieldsFile='';
let filterUpdateRunning=false;
let filterRefreshTimer=null;
let siteCleanupPending=false;
let siteCleanupCompleted=false;
const riskApproved=new Set();

function isWebURL(url) {return isAllowedWebNavigation(url)}
function originFor(url) {
  try {return isWebURL(url) ? new URL(url).origin : ''} catch {return ''}
}
function searchURL(query) { return ENGINES[data.settings.searchEngine](query) }
function normalize(input) {
  const value = String(input ?? '').trim().slice(0, 12000);
  if (!value || value === HOME) return HOME;
  // Nunca enviar al buscador direcciones con credenciales ni esquemas especiales.
  if (/^https?:\/\//i.test(value) && !isWebURL(value)) throw Error('Dirección web no válida: no se admiten credenciales dentro de la URL.');
  if (/^(?:file|javascript|data|blob|about|chrome|chrome-extension|devtools|electron|ms-settings):/i.test(value))
    throw Error('Este tipo de dirección no está permitido en Gravity.');
  if (isWebURL(value)) return new URL(value).href;
  if (!/\s/.test(value) && /^(?:localhost|127(?:\.\d{1,3}){3})(?::\d{1,5})?(?:[/?#]|$)/i.test(value)) return `http://${value}`;
  // Aceptar dominios internacionalizados (IDN): URL los convierte a punycode de forma segura.
  const looksLikeDomain=/^[\w-]+(?:\.[\w-]+)*\.[a-z]{2,}(?::\d{1,5})?(?:[/?#]|$)/i.test(value) ||
    /^[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+(?::\d{1,5})?(?:[/?#]|$)/u.test(value);
  if (!/\s/.test(value) && looksLikeDomain) {
    try {return new URL(`https://${value}`).href} catch {/* búsqueda */}
  }
  // Sitios conocidos exactos: «youtube» abre YouTube, no un buscador intermediario.
  const known=directSite(value);
  if(known)return known;
  return searchURL(value);
}
function current() {return tabs.find(t=>t.id===active)}
function tabByWebContents(wc) {return tabs.find(t=>t.view?.webContents===wc)}
function notice(message) {if (win && !win.isDestroyed()) win.webContents.send('notice', String(message))}
function notifyUI(action) {if (win && !win.isDestroyed()) win.webContents.send('ui-action', action)}
function send() {
  // Agrupar cambios de sonido/título/navegación del mismo ciclo para reducir IPC,
  // especialmente si existen miles de favoritos. Ningún cambio de estado se descarta.
  if(deferUI || pendingStateSend || !win || win.isDestroyed())return;
  pendingStateSend=true;
  setImmediate(()=>{
    pendingStateSend=false;
    if(!deferUI && win && !win.isDestroyed())win.webContents.send('state',snapshot());
  });
}
function downloadSnapshot() {return downloads.map(({id,name,status,scanStatus,received,total,paused,privateTab,when,error})=>({id,name,status,scanStatus,received,total,paused,privateTab,when,error}))}
function sendDownloads(force=false) {
  const now=Date.now(); if(!force&&now-downloadNotifyTime<280) return;
  downloadNotifyTime=now;
  if(win&&!win.isDestroyed())win.webContents.send('downloads',downloadSnapshot());
}
function cleanStoredSettings(settings) {
  const result={...DEFAULT_SETTINGS};
  if(settings && typeof settings==='object'){
    if(Object.hasOwn(ENGINES,settings.searchEngine)) result.searchEngine=settings.searchEngine;
    for(const key of ['restoreTabs','blockTrackers','blockThirdPartyCookies','autoUpdateFilterLists','clearSiteDataOnExit','askDownloadLocation','autoSleepTabs']) if(typeof settings[key]==='boolean')result[key]=settings[key];
    if(typeof settings.shieldsMigratedV112==='boolean')result.shieldsMigratedV112=settings.shieldsMigratedV112;
    if(Array.isArray(settings.trackerExceptions))result.trackerExceptions=[...new Set(settings.trackerExceptions.filter(s=>typeof s==='string'&&originFor(s)===s))].slice(0,100);
  }
  return result;
}
function loadProfile() {
  dataFile=path.join(app.getPath('userData'),'gravity-profile.json');
  // Protege incluso perfiles antiguos cuyo JSON esté dañado.
  try{if(fs.existsSync(dataFile)&&!fs.existsSync(dataFile+'.backup-before-pro'))fs.copyFileSync(dataFile,dataFile+'.backup-before-pro')}catch{}
  const recovered=readProfile(dataFile,message=>{console.warn('[Gravity perfil]',message);log?.write('PROFILE_READ_ERROR')});
  recoverySource=recovered.from;
  if(recovered.value){
    const old=recovered.value;
    if(recoverySource!=='primary') log?.write('PROFILE_RESTORED');
    for(const key of ['restore','bookmarks','history','shortcuts','downloads'])if(Array.isArray(old[key]))data[key]=old[key];
    data.settings=cleanStoredSettings(old.settings);
    // Migración única de Escudos para perfiles antiguos; una decisión posterior del usuario se respeta.
    // El perfil histórico nunca se borra ni cambia de ubicación.
    if(!data.settings.shieldsMigratedV112){
      data.settings.blockTrackers=true;
      data.settings.shieldsMigratedV112=true;
    }
    if(Array.isArray(old.tabGroups)){
      data.tabGroups=[...new Set(old.tabGroups.filter(name=>{
        try{return Boolean(cleanGroup(name))}catch{return false}
      }).map(name=>cleanGroup(name)))].slice(0,12);
    }
    if(Number.isInteger(old.restoreActive)&&old.restoreActive>=0)data.restoreActive=old.restoreActive;
  }
  // Conservar TODOS los favoritos válidos de perfiles anteriores, incluso si exceden el tope actual.
  data.bookmarks=data.bookmarks.filter(x=>x&&isWebURL(x.url)&&typeof x.title==='string');
  data.history=data.history.filter(x=>x&&isWebURL(x.url)&&typeof x.title==='string').slice(0,MAX_HISTORY);
  data.shortcuts=data.shortcuts.filter(x=>x&&isWebURL(x.url)&&typeof x.name==='string').slice(0,5);
  data.downloads=data.downloads.filter(x=>x&&typeof x.name==='string'&&typeof x.status==='string').slice(0,MAX_DOWNLOADS).map(x=>({
    id:String(x.id||randomUUID()),name:x.name.slice(0,255),status:x.status==='completed'?'completed':'interrupted',
    received:Number(x.received)||0,total:Number(x.total)||0,paused:false,privateTab:false,when:Number(x.when)||Date.now(),error:'',path:typeof x.path==='string'?x.path.slice(0,4096):''
  }));
  downloads=data.downloads.map(x=>({...x}));
}
function writeProfile() {
  clearTimeout(writeTimer);
  if(!dataFile)return;
  const permanentTabs=tabs.filter(t=>!t.private);
  data.restore=permanentTabs.map(t=>({url:t.url,pinned:Boolean(t.pinned),group:t.group||''})); // Orden, fijados y grupos.
  data.restoreActive=Math.max(0,permanentTabs.findIndex(t=>t.id===active));
  data.downloads=downloads.filter(x=>!x.privateTab).slice(0,MAX_DOWNLOADS).map(x=>({...x, status:['progressing','paused'].includes(x.status)?'interrupted':x.status}));
  try {
    atomicWriteProfile(dataFile,data,message=>console.warn('[Gravity perfil]',message));
    return true;
  } catch(e) {log?.write('PROFILE_WRITE_ERROR');notice('No se pudieron guardar los datos locales. Revisa el espacio en disco.');return false}
}
function commitBookmarks(next){
  const previous=data.bookmarks;
  data.bookmarks=next;
  // Confirmar el guardado en disco ANTES de informar que se guardó un favorito.
  if(!writeProfile()){data.bookmarks=previous;log?.write('BOOKMARK_WRITE_ERROR');throw Error('No se pudieron guardar los favoritos. Revisa el espacio disponible o el tamaño del perfil.')}
  send();
}
function save() {clearTimeout(writeTimer);writeTimer=setTimeout(writeProfile,450)}
function snapshot() {
  return {
    tabs:tabs.map(t=>{
      const wc=t.view?.webContents,history=wc?.navigationHistory;
      return {id:t.id,url:t.url,title:t.title,loading:t.loading,error:t.error,private:t.private,
        favicon:t.favicon||'',muted:wc?.isAudioMuted?.()||false,audible:t.audible||false,blocked:t.blocked||0,pinned:Boolean(t.pinned),group:t.group||'',
        back:history?.canGoBack()||false,forward:history?.canGoForward()||false};
    }),
    active,bookmarks:data.bookmarks,history:data.history,shortcuts:data.shortcuts,tabGroups:data.tabGroups,
    settings:data.settings,downloads:downloadSnapshot(),permissions:permissionSnapshot(),motion:true
  };
}
function permissionSnapshot(){
  return [...allowedByPartition.entries()].flatMap(([partition,grants])=>grants.list().map(pair=>({partition:partition===NORMAL_PARTITION?'normal':'private',origin:pair.split('|')[0],permission:pair.split('|').slice(1).join('|')})));
}
function bounds() {
  if(!win||win.isDestroyed())return;
  const [width,height]=win.getContentSize();
  for(const t of tabs) t.view?.setBounds({x:0,y:top,width,height:Math.max(0,height-top)});
}
function select(id) {
  const t=tabs.find(tab=>tab.id===id);
  if(!t||!win)return;
  t.lastActivatedAt=Date.now();
  if(t.lazy){t.lazy=false;navigate(t,t.url);return}
  active=id;
  for(const candidate of tabs)candidate.view?.setVisible(candidate.id===id&&!overlay&&!candidate.error&&candidate.url!==HOME);
  if(t.view)win.contentView.addChildView(t.view);
  bounds();send();save();
}
function removeView(tab){
  if(tab.view){
    const wc=tab.view.webContents;
    try{win?.contentView.removeChildView(tab.view)}catch{}
    if(!wc.isDestroyed())wc.close();
    tab.view=null;
  }
}
function record(tab){
  if(tab.private||!isWebURL(tab.url))return;
  data.history=[{url:tab.url,title:tab.title,time:Date.now()},...data.history.filter(h=>h.url!==tab.url)].slice(0,MAX_HISTORY);
  save();
}
function permissionSet(partition){
  if(!allowedByPartition.has(partition))allowedByPartition.set(partition,createPermissionGrants());
  return allowedByPartition.get(partition);
}
function firstPartyForRequest(details){
  const tab=tabs.find(t=>t.view?.webContents.id===details.webContentsId);
  if(tab && isWebURL(tab.url))return tab.url;
  if(typeof details.initiatorOrigin==='string'&&isWebURL(details.initiatorOrigin))return details.initiatorOrigin;
  return '';
}
function shieldsExcepted(url){
  const origin=originFor(url);
  return Boolean(origin&&data.settings.trackerExceptions.includes(origin));
}
function trackingBlocked(details){
  if(!shields)return false;
  return shields.shouldBlock(details,firstPartyForRequest(details));
}
async function updatePublicFilterLists(){
  if(filterUpdateRunning)throw Error('Ya hay una actualización de filtros en curso');
  const confirmation=await dialog.showMessageBox(win,{
    type:'question',message:'Actualizar filtros de anuncios y rastreadores',
    detail:'Se descargarán listas públicas EasyList y EasyPrivacy mediante HTTPS. Esos servidores verán la conexión necesaria para descargar las listas. No se envían tus búsquedas, cookies, historial ni direcciones visitadas a Gravity. Los filtros existentes siguen activos si falla la descarga.',
    buttons:['Cancelar','Descargar listas'],defaultId:0,cancelId:0,noLink:true
  });
  if(confirmation.response!==1)return {cancelled:true};
  filterUpdateRunning=true;
  try{
    const rules=await downloadLists();
    saveRules(shieldsFile,rules);
    shields.replaceRules(rules);
    notice(`Escudos actualizados: ${shields.rulesCount()} reglas de red y visuales. Recarga los sitios para aplicar cambios.`);
    return {updated:true,rules:shields.rulesCount()};
  }finally{filterUpdateRunning=false}
}
// El bloqueo integrado funciona sin conexión. Los filtros públicos se renuevan
// opcionalmente, de forma automática por defecto y sin enviar historial ni búsquedas.
function scheduleFilterRefresh(){
  if(filterRefreshTimer)clearTimeout(filterRefreshTimer);
  filterRefreshTimer=setTimeout(async()=>{
    if(!data.settings.autoUpdateFilterLists||!data.settings.blockTrackers||filterUpdateRunning||!win||win.isDestroyed())return;
    const marker=path.join(app.getPath('userData'),'gravity-shields-last-attempt.json');
    if(!shouldRefreshFilters(shieldsFile,marker))return;
    filterUpdateRunning=true;
    try{
      writeAttempt(marker);
      const rules=await downloadLists();
      saveRules(shieldsFile,rules);
      shields?.replaceRules(rules);
      // Sin ventanas emergentes ni alertas por actualizaciones normales.
      log?.write('FILTER_LIST_UPDATED');
    }catch{log?.write('FILTER_LIST_UPDATE_FAILED')}
    finally{filterUpdateRunning=false}
  },16000);
  filterRefreshTimer.unref?.();
}
async function confirmSiteRisk(url){
  const assessment=assessWebsite(url);
  if(!assessment.warn||riskApproved.has(assessment.host))return true;
  if(!win||win.isDestroyed())return false;
  const answer=await dialog.showMessageBox(win,{
    type:'warning',message:`Gravity detectó señales de riesgo en ${assessment.host}`,
    detail:assessment.reasons.join('\n')+'\n\nNo es una detección antivirus ni garantiza que otros sitios sean seguros. Si no reconoces esta dirección, no introduzcas contraseñas ni descargues archivos.',
    buttons:['Volver, no abrir','Entiendo el riesgo, continuar'],defaultId:0,cancelId:0,noLink:true
  });
  if(answer.response===1){
    if(riskApproved.size>128)riskApproved.clear();
    riskApproved.add(assessment.host);
    return true;
  }
  return false;
}
function configureSession(partition){
  const profile=session.fromPartition(partition);
  if(privateSessions.has(partition))return profile;
  privateSessions.add(partition);
  const granted=permissionSet(partition);
  profile.setPermissionCheckHandler((_wc,permission,requestingOrigin,details)=>{
    // Fullscreen pedido mediante acción del usuario: no necesita acceso a dispositivos.
    if(permission==='fullscreen')return shouldAllowFullscreen(permission,_wc?.getURL?.(),requestingOrigin,details);
    const candidate=checkPermissionContext(requestingOrigin,permission,details);
    return candidate.allowed && granted.has(candidate.origin,permission);
  });
  profile.setPermissionRequestHandler(async(wc,permission,done,details)=>{
    let finished=false;
    const reply=(allowed)=>{if(!finished){finished=true;done(Boolean(allowed))}};
    // Sin aviso para fullscreen normal de marco principal HTTPS/localhost seguro.
    // No habilitar automatic-fullscreen, cámara, geolocalización ni micrófono.
    if(permission==='fullscreen')return reply(shouldAllowFullscreen(permission,wc?.getURL?.(),'',details));
    const context=requestPermissionContext(wc?.getURL?.(),permission,details);
    const origin=context.origin;
    if(!context.allowed||!win||win.isDestroyed()||(partition!==NORMAL_PARTITION&&!privateSessions.has(partition))){
      log?.write('PERMISSION_DENIED',{permission:PERMISSIONS.has(permission)?permission:'other',scope:partition===NORMAL_PARTITION?'normal':'private'});
      return reply(false);
    }
    if(granted.has(origin,permission))return reply(true);
    try{
      const initialTopOrigin=safeOrigin(wc?.getURL?.());
      const result=await dialog.showMessageBox(win,{
        type:'question',message:`${origin} solicita ${permission}`,
        detail:'Autoriza solo si confías en este sitio. Los permisos caducan a los 30 minutos y no se almacenan en tu perfil. Para cámara o micrófono, comprueba que sea el sitio correcto.',
        buttons:['Denegar','Permitir'],defaultId:0,cancelId:0,noLink:true
      });
      // La página o ventana privada pudo cerrarse/navegar durante la confirmación.
      const stillOpen=wc&&!wc.isDestroyed()&&(partition===NORMAL_PARTITION||privateSessions.has(partition));
      const accepted=result.response===1&&stillOpen&&(!initialTopOrigin||safeOrigin(wc.getURL())===initialTopOrigin);
      if(accepted){granted.allow(origin,permission);send()}
      log?.write(accepted?'PERMISSION_GRANTED':'PERMISSION_DENIED',{permission,scope:partition===NORMAL_PARTITION?'normal':'private'});
      reply(accepted);
    }catch{reply(false)}
  });
  // WebUSB/HID/Serial no se autorizan automáticamente mediante ventanas de selección.
  if(typeof profile.setDevicePermissionHandler==='function')profile.setDevicePermissionHandler(()=>false);
  // Electron solo permite un listener por evento: conservar todos los Escudos en el mismo sitio.
  const filter={urls:['http://*/*','https://*/*']};
  profile.webRequest.onBeforeRequest(filter,(details,callback)=>callback({cancel:trackingBlocked(details)}));
  profile.webRequest.onBeforeSendHeaders(filter,(details,callback)=>{
    callback(shields?shields.requestHeaders(details,firstPartyForRequest(details)):{requestHeaders:details.requestHeaders});
  });
  profile.webRequest.onHeadersReceived(filter,(details,callback)=>{
    callback(shields?shields.responseHeaders(details,firstPartyForRequest(details)):{responseHeaders:details.responseHeaders});
  });
  const onDownload=(_event,item,wc)=>trackDownload(item,tabByWebContents(wc)?.private||partition!==NORMAL_PARTITION,wc?.id);
  profile.on('will-download',onDownload);
  sessionHandlers.set(partition,{profile,onDownload});
  return profile;
}
function rotatePrivateSessionIfEmpty() {
  if(tabs.some(t=>t.private))return;
  const old=privatePartition;
  privatePartition=`gravity-private-${randomUUID()}`;
  allowedByPartition.get(old)?.clear();
  allowedByPartition.delete(old);
  privateSessions.delete(old);
  const handlers=sessionHandlers.get(old);
  sessionHandlers.delete(old);
  if(handlers){
    try{handlers.profile.removeListener('will-download',handlers.onDownload)}catch{}
    try{handlers.profile.setPermissionRequestHandler(null)}catch{}
    try{handlers.profile.setPermissionCheckHandler(null)}catch{}
    try{handlers.profile.setDevicePermissionHandler?.(null)}catch{}
    try{handlers.profile.webRequest.onBeforeRequest(null)}catch{}
    try{handlers.profile.webRequest.onBeforeSendHeaders(null)}catch{}
    try{handlers.profile.webRequest.onHeadersReceived(null)}catch{}
    // La sesión de Electron puede seguir viva hasta terminar el proceso.
    // Se cierran referencias/controladores; no se promete liberar RAM nativa inmediatamente.
    void Promise.allSettled([handlers.profile.clearStorageData(),handlers.profile.clearCache()]);
  }
}
function filenameFor(item) {
  const raw=String(item.getFilename()||'descarga').slice(0,255);
  const cleaned=cleanDownloadFilename(raw);
  const directory=app.getPath('downloads');
  const ext=path.extname(cleaned),base=cleaned.slice(0,cleaned.length-ext.length)||'descarga';
  let candidate=path.join(directory,cleaned),i=1;
  const used=new Set(downloads.map(x=>x.path).filter(Boolean));
  while(fs.existsSync(candidate)||used.has(candidate))candidate=path.join(directory,`${base} (${i++})${ext}`);
  return candidate;
}
function trackDownload(item,isPrivate=false,webContentsId=null){
  // Antes de iniciar una descarga que puede ejecutar código, pedir consentimiento.
  if(!chooseDangerousDownload(item,win,dialog,notice))return;
  const id=`d${++downloadSeq}-${Date.now()}`;
  const row={id,name:cleanDownloadFilename(item.getFilename()||'Descarga'),status:'progressing',scanStatus:'no-analizado',received:0,total:item.getTotalBytes(),paused:false,privateTab:Boolean(isPrivate),when:Date.now(),error:'',webContentsId};
  try{if(!data.settings.askDownloadLocation){row.path=filenameFor(item);item.setSavePath(row.path)}}
  catch(e){row.error='No fue posible fijar la carpeta: '+e.message}
  downloads.unshift(row);
  // No ocultar descargas activas aunque haya más de 80 entradas históricas.
  let settled=0;
  downloads=downloads.filter(entry=>downloadItems.has(entry.id)||entry.id===id||settled++<MAX_DOWNLOADS);
  downloadItems.set(id,item);
  notice(`Descarga iniciada: ${row.name}`);sendDownloads(true);save();
  item.on('updated',(_e,state)=>{
    row.status=state==='interrupted'?'interrupted':'progressing';row.received=item.getReceivedBytes();row.total=item.getTotalBytes();row.paused=item.isPaused();
    sendDownloads();
  });
  item.once('done',(_e,status)=>{
    row.status=status;row.received=item.getReceivedBytes();row.total=item.getTotalBytes();row.paused=false;
    row.path=item.getSavePath()||row.path;
    if(status!=='completed')log?.write('DOWNLOAD_FAILED');
    downloadItems.delete(id);
    notice(status==='completed'?`Descarga terminada: ${row.name}`:`Descarga ${status}: ${row.name}`);
    sendDownloads(true);save();
    if(status==='completed'&&isDangerousDownload(row.path||row.name)&&process.platform==='win32')
      void scanDownload(row); // Escanear ejecutables con el antivirus del sistema si está disponible.

  });
}
async function scanDownload(row){
  if(!row||row.status!=='completed'||row.scanStatus==='analizando')return;
  row.scanStatus='analizando';sendDownloads(true);
  const answer=await scanDownloadedFile(row.path);
  row.scanStatus=answer.status;
  notice(answer.message);sendDownloads(true);
  save();
}
async function openDownload(id,folder=false){
  const item=downloads.find(d=>d.id===id);
  if(!item||item.status!=='completed'||!item.path||!fs.existsSync(item.path))return notice('El archivo no se encuentra en el disco.');
  if(folder){shell.showItemInFolder(item.path);return}
  if(item.scanStatus==='alert'){
    notice('Archivo bloqueado: Microsoft Defender informó detección o error. Revisa Seguridad de Windows.');return;
  }
  const risky=isDangerousDownload(item.path);
  if(risky){
    const result=await dialog.showMessageBox(win,{
      type:'warning',message:'Vas a abrir un archivo que puede ejecutar código',
      detail:`${item.name}\nAbre archivos descargados solo si confías en su procedencia. Un posible análisis con Microsoft Defender no puede garantizar que el archivo sea seguro.`,
      buttons:['Cancelar','Abrir bajo mi responsabilidad'],defaultId:0,cancelId:0,noLink:true
    });
    if(result.response!==1)return;
  }
  const message=await shell.openPath(item.path);
  if(message)notice(message);
}
async function downloadAction(action,id){
  const row=downloads.find(d=>d.id===id),item=downloadItems.get(id);
  if(!row)return;
  if(action==='scan'&&!item){await scanDownload(row);return}
  if(action==='pause'&&item){item.pause();row.paused=true;sendDownloads(true)}
  if(action==='resume'&&item){item.resume();row.paused=false;sendDownloads(true)}
  if(action==='cancel'&&item)item.cancel();
  if(action==='folder')openDownload(id,true);
  if(action==='open')void openDownload(id,false).catch(error=>notice('No se pudo abrir el archivo: '+error.message));
  if(action==='clear'&&!downloadItems.has(id)){downloads=downloads.filter(d=>d!==row);sendDownloads(true);save()}
}
function openContextMenu(tab,params){
  if(!win||win.isDestroyed())return;
  const options=[];
  const link=params.linkURL;
  if(isWebURL(link)){
    options.push({label:'Abrir enlace en otra pestaña',click:()=>create(link,tab.private)});
    options.push({label:'Copiar dirección del enlace',click:()=>clipboard.writeText(link)});
    options.push({type:'separator'});
  }
  if(params.selectionText)options.push({label:'Copiar selección',role:'copy'});
  options.push({label:'Atrás',enabled:Boolean(tab.view?.webContents.navigationHistory?.canGoBack()),click:()=>tab.view.webContents.navigationHistory.goBack()});
  options.push({label:'Recargar',click:()=>tab.view?.webContents.reload()});
  Menu.buildFromTemplate(options).popup({window:win});
}
function popupDecision(tab,info){
  if(!tabs.includes(tab))return {action:'deny'};
  const url=info.url;
  // Mantener ventanas pequeñas necesarias para OAuth/pagos, pero limitar abusos.
  const isPopup=info.disposition==='new-window'&&/(?:^|,)\s*(?:width|height)=\d+/i.test(info.features||'');
  if(isWebURL(url)&&assessWebsite(url).warn&&!riskApproved.has(assessWebsite(url).host)){
    notice('Gravity bloqueó la apertura automática de una ventana con señales de riesgo. Revisa la dirección antes de abrirla.');
    return {action:'deny'};
  }
  if(isPopup&&(isWebURL(url)||url==='about:blank')){
    const request=popupPolicy.reserve(tab.id);
    if(!request.allowed){notice('Gravity bloqueó ventanas emergentes excesivas.');return {action:'deny'}}
    return {action:'allow',outlivesOpener:false,overrideBrowserWindowOptions:{
      width:Math.min(850,Math.max(380,win?.getBounds().width/2||500)),height:650,
      backgroundColor:'#0b0d11',autoHideMenuBar:true,
      webPreferences:{partition:tab.private?privatePartition:NORMAL_PARTITION,nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,webviewTag:false}
    }};
  }
  if(isWebURL(url))setImmediate(()=>{if(tabs.includes(tab))void confirmSiteRisk(url).then(ok=>{if(ok&&tabs.includes(tab))create(url,tab.private)})});
  return {action:'deny'};
}
function protectPopup(popup,tab){
  if(!tabs.includes(tab)||!popupPolicy.attach(tab.id,popup)){
    try{popup.close()}catch{}
    return;
  }
  const wc=popup.webContents;
  wc.setWindowOpenHandler(({url})=>{if(isWebURL(url))setImmediate(()=>{if(tabs.includes(tab))create(url,tab.private)});return {action:'deny'}});
  for(const name of ['will-navigate','will-redirect'])wc.on(name,(e,url)=>{
    const target=typeof e.url==='string'?e.url:url;
    if(target&&!isWebURL(target)&&target!=='about:blank'){e.preventDefault();log?.write('NETWORK_BLOCKED')}
  });
}
function makeView(tab){
  const partition=tab.private?privatePartition:NORMAL_PARTITION;
  configureSession(partition);
  const view=new WebContentsView({webPreferences:{partition,nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,webviewTag:false,backgroundThrottling:true}});
  tab.view=view;
  win.contentView.addChildView(view);
  view.setBackgroundColor('#08090b');
  const wc=view.webContents;
  wc.setWindowOpenHandler(info=>popupDecision(tab,info));
  wc.on('did-create-window',popup=>protectPopup(popup,tab));
  for(const name of ['will-navigate','will-redirect'])wc.on(name,(event,url)=>{
    const destination=typeof event.url==='string'?event.url:url;
    if(destination&&!isWebURL(destination)){event.preventDefault();log?.write('NETWORK_BLOCKED');return}
    if(destination&&assessWebsite(destination).warn&&!riskApproved.has(assessWebsite(destination).host)){
      event.preventDefault();
      void confirmSiteRisk(destination).then(ok=>{
        if(ok&&tabs.includes(tab)&&tab.view===view&&!wc.isDestroyed())wc.loadURL(destination).catch(()=>{});
      });
    }
  });
  wc.on('dom-ready',()=>{
    const pageURL=wc.getURL();
    if(canInject(tab,data.settings)&&typeof wc.insertCSS==='function'){
      const cosmetic=shields?.cosmeticCssFor(pageURL)||'';
      wc.insertCSS(AD_CSS+'\n'+cosmetic,{cssOrigin:'user'}).catch(()=>{});
    }
    if(isYouTubeWatchUrl(pageURL))void installYouTubeContinuity(wc,pageURL);
    if(data.settings.blockTrackers&&isYoutubeVideoPage(pageURL)&&!shieldsExcepted(pageURL))
      void installYoutubeAdHandler(wc,pageURL);
  });
  wc.on('did-start-loading',()=>{tab.loading=true;tab.error='';tab.favicon='';if(tab.id===active)view.setVisible(!overlay);send()});
  wc.on('did-stop-loading',()=>{tab.loading=false;send()});
  wc.on('page-title-updated',(_event,title)=>{tab.title=String(title).slice(0,250);record(tab);send()});
  wc.on('page-favicon-updated',(_event,icons)=>{
    tab.favicon=icons.find(url=>{try{return new URL(url).protocol==='https:'}catch{return false}})||'';
    send();
  });
  attachAudioStateListener(wc,tab,send);
  for(const name of ['did-navigate','did-navigate-in-page'])wc.on(name,()=>{
    const url=wc.getURL();if(!isWebURL(url))return;
    tab.url=url;tab.error='';record(tab);send();
    // Las páginas de YouTube pueden cambiar el vídeo sin recargar (SPA).
    if(isYouTubeWatchUrl(url))void installYouTubeContinuity(wc,url);
    if(data.settings.blockTrackers&&isYoutubeVideoPage(url)&&!shieldsExcepted(url))
      void installYoutubeAdHandler(wc,url);
  });
  wc.on('did-fail-load',(_event,code,description,url,mainFrame)=>{
    if(tab.view!==view||!tabs.includes(tab))return;
    if(mainFrame&&code!==-3){
      log?.write('WEBPAGE_LOAD_FAILED',{errorCode:Number(code)});
      tab.error='No se pudo abrir la página. Comprueba la conexión y selecciona Reintentar.';
      tab.loading=false;view.setVisible(false);send();
    }
  });
  wc.on('render-process-gone',(_event,details)=>{
    if(tab.view!==view||!tabs.includes(tab))return;
    tab.viewCorrupted=true;
    tab.error='La página se cerró inesperadamente. Usa Reintentar para recuperarla.';
    tab.loading=false;view.setVisible(false);
    log?.write('RENDERER_CRASH',{reason:details?.reason||'unknown',scope:tab.private?'private':'normal'});
    send();
  });
  wc.on('unresponsive',()=>{
    if(tab.view!==view||!tabs.includes(tab))return;
    const now=Date.now();
    if(now-(tab.lastUnresponsiveNotice||0)>60000){
      tab.lastUnresponsiveNotice=now;log?.write('RENDERER_UNRESPONSIVE',{scope:tab.private?'private':'normal'});
      if(tab.id===active)notice('La página tarda en responder. Puedes detenerla o recargarla.');
    }
  });
  wc.on('found-in-page',(_e,result)=>{if(win&&!win.isDestroyed())win.webContents.send('found-in-page',result)});
  wc.on('context-menu',(_e,params)=>openContextMenu(tab,params));
  wc.on('before-input-event',(e,input)=>{if(input.type==='keyDown'&&shortcut(input))e.preventDefault()});
  bounds();return view;
}
function recoverPage(tab){
  if(!tab)return;
  if(tab.viewCorrupted){
    tab.viewCorrupted=false;tab.lastRequest=null;removeView(tab);navigate(tab,tab.url);return;
  }
  if(tab.view&&!tab.view.webContents.isDestroyed())tab.view.webContents.reload();
  else{tab.lastRequest=null;navigate(tab,tab.url)}
}
function navigate(tab,input){
  if(!tab)return;
  const url=normalize(input),now=Date.now();
  if(tab.lastRequest?.url===url&&now-tab.lastRequest.time<600)return;
  tab.lastRequest={url,time:now};overlay=false;tab.url=url;tab.error='';tab.viewCorrupted=false;tab.favicon='';tab.blocked=0;
  if(url===HOME){removeView(tab);tab.title=tab.private?'Nueva pestaña privada':'Nueva pestaña';tab.loading=false;select(tab.id);return}
  if(!tab.view)makeView(tab);
  tab.title='Cargando…';tab.loading=true;
  select(tab.id);tab.view.webContents.loadURL(url).catch(e=>{
    if(tab.view&&!tab.view.webContents.isDestroyed()&&tab.url===url){tab.error=String(e?.message||'Error de red');tab.loading=false;tab.view.setVisible(false);send()}
  });
  save();send();
}
function create(url=HOME,isPrivate=false,lazy=false,meta={}){
  if(tabs.length>=MAX_TABS){notice(`Máximo de ${MAX_TABS} pestañas abiertas`);return null}
  const tab={id:String(nextId++),url:HOME,title:isPrivate?'Nueva pestaña privada':'Nueva pestaña',loading:false,error:'',view:null,lastRequest:null,private:Boolean(isPrivate),favicon:'',audible:false,blocked:0,lazy:false,
    pinned:Boolean(meta.pinned),group:typeof meta.group==='string'&&data.tabGroups.includes(meta.group)?meta.group:''};
  tabs.push(tab);
  if(tab.pinned)tabs=sortedPinned(tabs);
  tab.lastActivatedAt=Date.now();
  if(lazy&&isWebURL(url)){tab.url=url;tab.title=new URL(url).hostname;tab.lazy=true;send()}
  else navigate(tab,url);
  return tab;
}
function closeTab(id){
  const index=tabs.findIndex(t=>t.id===id);if(index<0)return;
  const tab=tabs[index];
  if(tab.pinned){notice('Pestaña fijada: desfíjala desde el menú antes de cerrarla.');return false}
  if(!tab.private)closedTabs.unshift({url:tab.url,pinned:false,group:tab.group||''});
  closedTabs=closedTabs.slice(0,25);
  // Un hijo OAuth no debe mantener viva una sesión privada ya cerrada.
  popupPolicy.closeOpener(tab.id);
  removeView(tab);tabs.splice(index,1);
  if(!tabs.length)create();
  else if(active===id)select(tabs[Math.min(index,tabs.length-1)].id);
  else send();
  if(tab.private)rotatePrivateSessionIfEmpty();
  save();
}
function restoreClosed(){
  if(closedTabs.length){const entry=closedTabs.shift();create(entry.url,false,false,entry)}else notice('No hay pestañas recientes para recuperar');
}
function pinCurrentTab(){
  const tab=current();if(!tab)return false;
  tab.pinned=!tab.pinned;
  tabs=sortedPinned(tabs);send();save();
  notice(tab.pinned?'Pestaña fijada. Quedará al inicio y no se cerrará por accidente.':'Pestaña desfijada.');
  return tab.pinned;
}
function createTabGroup(name){
  const group=validateGroup(name,data.tabGroups);
  if(!group)throw Error('Escribe el nombre del grupo');
  if(!data.tabGroups.includes(group))data.tabGroups.push(group);
  save();send();return data.tabGroups;
}
function setCurrentTabGroup(name){
  const tab=current();if(!tab)throw Error('Abre una pestaña primero');
  const group=cleanGroup(name);
  if(group&&!data.tabGroups.includes(group))throw Error('Crea el grupo antes de asignarlo');
  tab.group=group;save();send();return true;
}
function deleteTabGroup(name){
  const group=cleanGroup(name);
  if(!data.tabGroups.includes(group))return false;
  data.tabGroups=data.tabGroups.filter(x=>x!==group);
  for(const tab of tabs)if(tab.group===group)tab.group='';
  save();send();return true;
}
function toggleBookmark(tab){
  if(!tab||!isWebURL(tab.url))return notice('Abre un sitio para guardarlo como favorito');
  const exists=data.bookmarks.some(b=>b.url===tab.url);
  if(!exists&&data.bookmarks.length>=MAX_BOOKMARKS)throw Error(`Has alcanzado ${MAX_BOOKMARKS} favoritos; exporta una copia antes de reorganizarlos.`);
  const next=exists?data.bookmarks.filter(b=>b.url!==tab.url):[{url:tab.url,title:tab.title},...data.bookmarks];
  commitBookmarks(next);
  notice(exists?'Favorito eliminado':'Favorito guardado');
}
function shortcut(input){
  const key=String(input.key||'').toLowerCase(),mod=input.control||input.meta;
  if(key==='enter'&&input.isAutoRepeat)return true;
  if(mod&&key==='l'){win.webContents.focus();win.webContents.send('focus');return true}
  if(mod&&key==='t'&&!input.shift){create();return true}
  if(mod&&key==='t'&&input.shift){restoreClosed();return true}
  if(mod&&key==='n'&&input.shift){create(HOME,true);return true}
  if(mod&&/^[1-9]$/.test(key)&&!input.shift){
    const index=key==='9'?tabs.length-1:Number(key)-1;
    if(tabs[index])select(tabs[index].id);
    return true;
  }
  if(mod&&key==='w'){closeTab(active);return true}
  if(mod&&key==='d'){toggleBookmark(current());return true}
  if(mod&&key==='h'){notifyUI('history');return true}
  if(mod&&key==='j'){notifyUI('downloads');return true}
  if(mod&&key==='f'){notifyUI('find');return true}
  if(mod&&key==='p'){current()?.view?.webContents.print({silent:false,printBackground:true});return true}
  if(mod&&key==='tab'){
    if(!tabs.length)return true;
    const index=tabs.findIndex(t=>t.id===active),step=input.shift?-1:1;
    select(tabs[(index+step+tabs.length)%tabs.length].id);return true;
  }
  if((mod&&key==='r')||key==='f5'){recoverPage(current());return true}
  if(mod&&['+','=','-','0'].includes(key)){
    const wc=current()?.view?.webContents;if(wc)wc.setZoomFactor(key==='0'?1:Math.max(.5,Math.min(2,wc.getZoomFactor()+(key==='-'?-.1:.1))));return true;
  }
  if(input.alt&&(key==='arrowleft'||key==='arrowright')){
    const navigation=current()?.view?.webContents.navigationHistory;
    if(key==='arrowleft'&&navigation?.canGoBack())navigation.goBack();
    if(key==='arrowright'&&navigation?.canGoForward())navigation.goForward();
    return true;
  }
  if(key==='escape'){notifyUI('escape');return false}
  return false;
}
function saveSettings(next){
  if(!next||typeof next!=='object')throw Error('Ajustes inválidos');
  const key=String(next.key||'');
  if(key==='searchEngine'&&Object.hasOwn(ENGINES,next.value))data.settings.searchEngine=next.value;
  else if(['restoreTabs','blockTrackers','blockThirdPartyCookies','autoUpdateFilterLists','clearSiteDataOnExit','askDownloadLocation','autoSleepTabs'].includes(key)&&typeof next.value==='boolean')data.settings[key]=next.value;
  else if(key==='trackerSite'&&typeof next.value==='boolean'){
    // No guardar el dominio de una navegación privada entre las excepciones persistentes.
    if(current()?.private)throw Error('Las excepciones persistentes no se editan desde pestañas privadas');
    const site=originFor(current()?.url||'');if(!site)throw Error('Abre primero una página');
    const excluded=new Set(data.settings.trackerExceptions);
    if(next.value)excluded.add(site);else excluded.delete(site);
    data.settings.trackerExceptions=[...excluded].slice(0,100);
  }else throw Error('Opción de configuración no válida');
  save();send();
}
async function exportBookmarks() {
  const result=await dialog.showSaveDialog(win,{
    title:'Exportar favoritos de Gravity',
    defaultPath:path.join(app.getPath('documents'),`Gravity-favoritos-${new Date().toISOString().slice(0,10)}.html`),
    buttonLabel:'Guardar favoritos',filters:[{name:'Favoritos HTML',extensions:['html']}]
  });
  if(result.canceled||!result.filePath)return {cancelled:true};
  const compatible=exportableBookmarks(data.bookmarks);
  const document=exportBookmarksHTML(compatible);
  // No escribir un HTML parcial sin advertir al usuario.
  if(Buffer.byteLength(document,'utf8')>MAX_BOOKMARK_FILE_BYTES)throw Error('La exportación supera 16 MB. Los favoritos originales siguen guardados.');
  // Evitar archivos HTML incompletos si falla una escritura o se llena el disco.
  const pending=`${result.filePath}.gravity-export-${randomUUID()}.tmp`;
  try{fs.writeFileSync(pending,document,{encoding:'utf8',flag:'wx',mode:0o600});fs.renameSync(pending,result.filePath)}
  finally{try{fs.unlinkSync(pending)}catch{}}
  const skipped=data.bookmarks.length-compatible.length;
  notice(`Se exportaron ${compatible.length} favoritos.${skipped?` ${skipped} no se exportaron por tener direcciones con credenciales no seguras.`:''}`);
  return {exported:compatible.length,skipped};
}
async function importBookmarks() {
  const result=await dialog.showOpenDialog(win,{
    title:'Importar favoritos a Gravity',properties:['openFile'],
    filters:[{name:'Favoritos HTML',extensions:['html','htm']}]
  });
  const filename=result.filePaths?.[0];
  if(result.canceled||!filename)return {cancelled:true};
  if(fs.statSync(filename).size>MAX_BOOKMARK_FILE_BYTES)throw Error('El archivo es demasiado grande (máximo 16 MB).');
  const entries=parseBookmarksHTML(fs.readFileSync(filename,'utf8'));
  if(!entries.length)throw Error('No se encontraron favoritos web válidos en este archivo.');
  const preview=mergeBookmarks(data.bookmarks,entries);
  if(!preview.added)return {imported:0,alreadyPresent:entries.length};
  const answer=await dialog.showMessageBox(win,{
    type:'question',message:`¿Importar ${preview.added} favoritos a Gravity?`,
    detail:'Se añadirán a los actuales, sin reemplazar los existentes. No se importan contraseñas ni cookies.',
    buttons:['Cancelar','Importar'],defaultId:0,cancelId:0,noLink:true
  });
  if(answer.response!==1)return {cancelled:true};
  commitBookmarks(preview.items);
  notice(`Se importaron ${preview.added} favoritos.`);
  return {imported:preview.added,alreadyPresent:entries.length-preview.added};
}
// Acciones adicionales de Gravity 0.8.1: nunca reemplazan datos ni controles existentes.
function duplicateCurrentTab(){
  const tab=current();
  if(!tab)return false;
  const copy=create(tab.url,tab.private);
  if(!copy)return false;
  notice('Pestaña duplicada sin cerrar ni alterar la original.');
  return true;
}
function copyCurrentURL(){
  const tab=current();
  if(!tab||!isWebURL(tab.url)){notice('Abre primero una página web para copiar su enlace.');return false}
  clipboard.writeText(tab.url);notice('Enlace copiado al portapapeles.');return true;
}
// Escritura atómica de archivos exportados por el usuario: ante un fallo no deja un resultado a medias.
function writeUserFileAtomically(destination,bytes){
  const pending=`${destination}.gravity-export-${randomUUID()}.tmp`;
  try{
    fs.writeFileSync(pending,bytes,{flag:'wx',mode:0o600});
    fs.renameSync(pending,destination);
  }finally{try{fs.unlinkSync(pending)}catch{}}
}
async function exportTabSet(){
  const collection=createSessionDocument(tabs,active);
  const confirmation=await dialog.showMessageBox(win,{
    type:'question',message:`¿Guardar ${collection.count} pestañas normales en un archivo?`,
    detail:'El archivo contendrá las direcciones completas, que pueden incluir búsquedas y datos sensibles. No incluye pestañas privadas, cookies ni contraseñas. Guárdalo en un lugar seguro.',
    buttons:['Cancelar','Guardar pestañas'],defaultId:0,cancelId:0,noLink:true
  });
  if(confirmation.response!==1)return {cancelled:true};
  const choice=await dialog.showSaveDialog(win,{
    title:'Guardar colección de pestañas de Gravity',
    defaultPath:path.join(app.getPath('documents'),`Gravity-pestanas-${new Date().toISOString().slice(0,10)}.json`),
    buttonLabel:'Guardar colección',filters:[{name:'Colección de pestañas Gravity',extensions:['json']}]
  });
  if(choice.canceled||!choice.filePath)return {cancelled:true};
  writeUserFileAtomically(choice.filePath,collection.content);
  notice(`Se guardaron ${collection.count} pestañas normales.${collection.excluded?' Se omitieron pestañas privadas o direcciones no exportables.':''}`);
  return {exported:collection.count,excluded:collection.excluded};
}
async function importTabSet(){
  const choice=await dialog.showOpenDialog(win,{
    title:'Abrir colección de pestañas Gravity',properties:['openFile'],
    filters:[{name:'Colección de pestañas Gravity',extensions:['json']}]
  });
  const filename=choice.filePaths?.[0];
  if(choice.canceled||!filename)return {cancelled:true};
  const stats=fs.statSync(filename);
  if(!stats.isFile()||stats.size>MAX_SESSION_BYTES)throw Error('La colección no es un archivo compatible (máximo 512 KB).');
  const imported=parseSessionDocument(fs.readFileSync(filename,'utf8'));
  // No cerrar pestañas, ni sobrescribir sesiones, ni importar una parte de la colección.
  if(imported.urls.length>MAX_TABS-tabs.length)
    throw Error(`Hay ${tabs.length} pestañas abiertas. Cierra algunas antes de importar las ${imported.urls.length} pestañas: no se modificó nada.`);
  const hosts=[...new Set(imported.urls.map(url=>url===HOME?'Inicio':new URL(url).hostname))];
  const answer=await dialog.showMessageBox(win,{
    type:'question',message:`¿Añadir ${imported.urls.length} pestañas a Gravity?`,
    detail:`Las pestañas actuales NO se reemplazarán. Se abrirán bajo demanda. Sitios: ${hosts.slice(0,8).join(', ')}${hosts.length>8?'…':''}. Importa solo colecciones de confianza.`,
    buttons:['Cancelar','Añadir pestañas'],defaultId:0,cancelId:0,noLink:true
  });
  if(answer.response!==1)return {cancelled:true};
  // Validar todo antes de ejecutar: se preservan duplicados intencionales y orden.
  const created=[];
  for(const url of imported.urls){
    const tab=create(url,false,true);
    if(!tab)throw Error('No se pudo añadir una pestaña. Revisa el estado actual.');
    created.push(tab);
  }
  if(created[imported.activeIndex])select(created[imported.activeIndex].id);
  save();send();notice(`Se añadieron ${created.length} pestañas; las anteriores permanecen abiertas.`);
  return {imported:created.length};
}
async function saveCurrentPagePDF(){
  const tab=current(),wc=tab?.view?.webContents;
  if(!tab||!isWebURL(tab.url)||!wc||wc.isDestroyed()||tab.loading||tab.viewCorrupted)
    throw Error('Abre y termina de cargar una página web antes de guardarla como PDF.');
  const filename=cleanDownloadFilename(tab.title||new URL(tab.url).hostname).replace(/\.pdf$/i,'').slice(0,125)||'Pagina';
  const choice=await dialog.showSaveDialog(win,{
    title:'Guardar página como PDF',
    defaultPath:path.join(app.getPath('documents'),`${filename}.pdf`),
    buttonLabel:'Guardar PDF',filters:[{name:'Documento PDF',extensions:['pdf']}]
  });
  if(choice.canceled||!choice.filePath)return {cancelled:true};
  // Chromium genera el PDF; no se guarda HTML, scripts ni el perfil del usuario.
  const pdf=await wc.printToPDF({printBackground:true,preferCSSPageSize:true});
  if(!Buffer.isBuffer(pdf)||pdf.length<8||pdf.length>100*1024*1024||pdf.toString('ascii',0,5)!=='%PDF-')
    throw Error('No se pudo generar un PDF válido (máximo 100 MB).');
  writeUserFileAtomically(choice.filePath,pdf);
  notice('Página guardada como PDF.');return {saved:true,bytes:pdf.length};
}

async function switchProfile(id){
  const target=profiles.resolve(PROFILE_ROOT,String(id||''));
  if(target.id===SELECTED_PROFILE.id)return {same:true};
  if(downloadItems.size)throw Error('Termina o cancela las descargas antes de cambiar de perfil.');
  const answer=await dialog.showMessageBox(win,{type:'question',message:`¿Cambiar a «${target.name}»?`,
    detail:'Gravity se reiniciará. Cada perfil tiene sus propias pestañas, cookies, favoritos y contraseñas. El perfil original permanecerá intacto.',
    buttons:['Cancelar','Cambiar de perfil'],defaultId:0,cancelId:0,noLink:true});
  if(answer.response!==1)return {cancelled:true};
  if(!writeProfile())throw Error('No se pudo guardar el perfil actual. Cambio cancelado.');
  crashMarker?.clean();
  app.relaunch({args:profiles.relaunchArgs(process.argv.slice(1),target.id)});
  app.quit();return {restarting:true};
}
function requireVaultOrigin(){
  const t=current();if(!t||t.private||!t.url?.startsWith('https://'))
    throw Error('Abre un sitio HTTPS en una pestaña normal para gestionar sus credenciales.');
  return originFor(t.url);
}
function addCredential(values){
  const origin=requireVaultOrigin();
  if(!values||typeof values!=='object')throw Error('Datos inválidos');
  const result=vaultInstance.add({origin,username:values.username,password:values.password});
  notice('Credencial cifrada localmente para el sitio HTTPS actual.');return result;
}
async function removeCredential(id){
  const origin=requireVaultOrigin();
  if(!vaultInstance.list().entries.some(item=>item.id===String(id)&&item.origin===origin))throw Error('Solo puedes borrar credenciales del sitio HTTPS actual');
  const answer=await dialog.showMessageBox(win,{type:'warning',message:'¿Eliminar esta credencial guardada?',
    detail:'Esta acción no se puede deshacer. No afectará las contraseñas almacenadas por otros navegadores.',
    buttons:['Cancelar','Eliminar'],defaultId:0,cancelId:0,noLink:true});
  if(answer.response!==1)return false;
  const deleted=vaultInstance.remove(String(id||''));if(deleted)notice('Credencial eliminada.');return deleted;
}
function copyCredential(id){
  const origin=requireVaultOrigin();
  const secret=vaultInstance.revealForClipboard(String(id||''),origin);
  clipboard.writeText(secret);
  clearTimeout(clipboardClearTimer);
  const digest=createHash('sha256').update(secret).digest('hex');
  clipboardClearTimer=setTimeout(()=>{
    try{if(createHash('sha256').update(clipboard.readText()).digest('hex')===digest)clipboard.clear()}
    catch{}
  },30000);
  clipboardClearTimer.unref?.();
  notice('Contraseña copiada durante 30 segundos. Pégala solo en el sitio correspondiente.');
  return true;
}
async function translateCurrentPage(language='es'){
  const t=current();if(!t||!isWebURL(t.url)||t.private)throw Error('La traducción externa solo está disponible para pestañas normales HTTP(S).');
  const link=translationLink(t.url,language);
  const decision=await dialog.showMessageBox(win,{type:'warning',message:'Traducción mediante Google Translate',
    detail:'Si continúas, se enviará la dirección completa de esta página a Google. No traduzcas páginas privadas, intranets, documentos confidenciales ni enlaces con tokens. Algunas páginas con inicio de sesión no podrán traducirse.',
    buttons:['Cancelar','Enviar dirección y traducir'],defaultId:0,cancelId:0,noLink:true});
  if(decision.response!==1)return {cancelled:true};
  const created=create(link,false);return {opened:Boolean(created)};
}
async function openReaderMode(){
  const t=current(),wc=t?.view?.webContents;
  if(!t||!wc||wc.isDestroyed()||t.loading||!isWebURL(t.url))throw Error('Espera a que cargue una página con un artículo.');
  const article=validateReader(await wc.executeJavaScript(READER_SCRIPT,true));
  const reader=new BrowserWindow({parent:win,width:980,height:760,minWidth:620,minHeight:480,
    title:'Gravity · Modo lectura',backgroundColor:'#101114',autoHideMenuBar:true,
    webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,webviewTag:false}});
  reader.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  reader.webContents.on('will-navigate',e=>e.preventDefault());
  reader.webContents.once('did-finish-load',()=>{
    if(reader.isDestroyed())return;
    // Datos insertados como objeto JavaScript (no como HTML); el lector usa textContent.
    const serialized=JSON.stringify(article).replace(/</g,'\\u003c');
    void reader.webContents.executeJavaScript('window.gravityShowReader('+serialized+')').catch(()=>{});
  });
  await reader.loadFile('app/reader.html');return {opened:true,paragraphs:article.paragraphs.length};
}
async function saveScreenshot(image,name){
  const bytes=Buffer.isBuffer(image)?image:image.toPNG();
  if(bytes.length<8||bytes.length>75*1024*1024||!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))
    throw Error('La imagen capturada no es un PNG válido o supera 75 MB.');
  const choice=await dialog.showSaveDialog(win,{title:'Guardar captura de Gravity',
    defaultPath:path.join(app.getPath('pictures')||app.getPath('documents'),name+'.png'),
    buttonLabel:'Guardar captura',filters:[{name:'Imagen PNG',extensions:['png']}]});
  if(choice.canceled||!choice.filePath)return {cancelled:true};
  writeUserFileAtomically(choice.filePath,bytes);
  notice('Captura de pantalla guardada.');return {saved:true,bytes:bytes.length};
}
async function captureFullPage(wc){
  if(!wc.debugger||wc.debugger.isAttached())throw Error('La captura completa necesita el depurador disponible. Cierra DevTools e inténtalo otra vez.');
  wc.debugger.attach('1.3');
  try{
    await wc.debugger.sendCommand('Page.enable');
    const metrics=await wc.debugger.sendCommand('Page.getLayoutMetrics');
    const dimensions=metrics.cssContentSize||metrics.contentSize;
    const width=Math.ceil(dimensions?.width||0),height=Math.ceil(dimensions?.height||0);
    if(width<1||height<1||width>5000||height>16000||width*height>28000000)
      throw Error('Esta página es demasiado grande para una captura completa segura. Usa la captura visible o PDF.');
    const result=await wc.debugger.sendCommand('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,
      clip:{x:0,y:0,width,height,scale:1}});
    return Buffer.from(result.data,'base64');
  }finally{try{wc.debugger.detach()}catch{}}
}
async function captureCurrentPage(mode){
  const t=current(),wc=t?.view?.webContents;
  if(!t||!isWebURL(t.url)||!wc||wc.isDestroyed()||t.loading||t.viewCorrupted)
    throw Error('Abre una página y espera a que termine de cargar antes de capturar.');
  const filename=cleanDownloadFilename(t.title||'Gravity-captura').replace(/\.(?:png|pdf)$/i,'').slice(0,90)||'Gravity-captura';
  if(mode==='full')return saveScreenshot(await captureFullPage(wc),filename+'-completa');
  if(!['visible','region'].includes(mode))throw Error('Modo de captura no admitido');
  if(overlay){overlay=false;select(t.id)}
  const image=await wc.capturePage();
  if(mode==='visible')return saveScreenshot(image,filename);
  if(cropWindow&&!cropWindow.isDestroyed()){cropWindow.focus();return {opened:true}}
  cropImage=nativeImage.createFromBuffer(image.toPNG(),{scaleFactor:1});
  cropWindow=new BrowserWindow({parent:win,width:1050,height:780,minWidth:560,minHeight:430,
    title:'Gravity · Seleccionar captura',backgroundColor:'#101114',autoHideMenuBar:true,
    webPreferences:{preload:path.join(__dirname,'crop-preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,webviewTag:false}});
  cropWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  cropWindow.webContents.on('will-navigate',e=>e.preventDefault());
  cropWindow.webContents.once('did-finish-load',()=>{
    if(cropWindow&&!cropWindow.isDestroyed())cropWindow.webContents.send('gravity-crop-image',cropImage.toPNG().toString('base64'));
  });
  cropWindow.on('closed',()=>{cropWindow=null;cropImage=null});
  await cropWindow.loadFile('app/crop.html');return {opened:true};
}
async function sleepInactive() {
  const busyIds=new Set(downloads.filter(d=>downloadItems.has(d.id)).map(d=>d.webContentsId));
  const eligible=tabs.filter(t=>{
    if(t.id===active||t.private||t.pinned||t.lazy||!t.view||!isWebURL(t.url)||t.loading||t.audible||t.error||t.viewCorrupted||protectedHost(t.url))return false;
    const wc=t.view.webContents;
    if(wc.isDestroyed()||busyIds.has(wc.id))return false;
    // Si Electron informa sonido aunque no haya llegado aún el evento, proteger la pestaña.
    try{if(wc.isCurrentlyAudible?.())return false}catch{}
    return true;
  });
  if(!eligible.length){notice('No hay pestañas inactivas aptas para poner en reposo.');return {suspended:0}}
  const answer=await dialog.showMessageBox(win,{
    type:'question',message:`¿Liberar memoria de ${eligible.length} pestañas inactivas?`,
    detail:'Sus páginas se volverán a cargar al seleccionarlas. Los formularios sin guardar pueden perderse. Las pestañas privadas, con sonido y con descargas activas quedan intactas.',
    buttons:['Cancelar','Liberar memoria'],defaultId:0,cancelId:0,noLink:true
  });
  if(answer.response!==1)return {cancelled:true};
  let suspended=0;
  for(const tab of eligible){
    // Verificación estricta después del consentimiento: no cerrar formularios, multimedia o SPA activas.
    const wc=tab.view?.webContents;
    if(!wc||wc.isDestroyed()||!await safeToSuspend(wc))continue;
    const busyNow=new Set(downloads.filter(d=>downloadItems.has(d.id)).map(d=>d.webContentsId));
    if(!tabs.includes(tab)||tab.id===active||tab.view?.webContents!==wc||busyNow.has(wc.id)||tab.pinned||tab.private||tab.audible)continue;
    tab.lazy=true;tab.loading=false;tab.error='';tab.viewCorrupted=false;removeView(tab);suspended++;
  }
  if(suspended){send();save()}notice(suspended?`Memoria liberada de ${suspended} pestañas verificadas.`:'No hubo pestañas seguras para suspender.');
  return {suspended};
}
// La comprobación periódica es una OPT-IN explícita y nunca cierra pestañas críticas.
// No inspecciona ni almacena los valores de formularios: el navegador solo recibe true/false.
async function autoSleepIdleTabs(now=Date.now()){
  if(memorySweepRunning||!data.settings.autoSleepTabs||!win||win.isDestroyed())return {suspended:0};
  memorySweepRunning=true;let count=0;
  try{
    const busy=new Set(downloads.filter(d=>downloadItems.has(d.id)).map(d=>d.webContentsId));
    const candidates=tabs.filter(tab=>eligible(tab,active,busy,now)).slice(0,MAX_PER_SWEEP);
    for(const tab of candidates){
      const wc=tab.view?.webContents;
      if(!wc||!await safeToSuspend(wc))continue;
      // Una pestaña pudo activarse, descargar o cambiar mientras Chromium contestaba.
      const latestBusy=new Set(downloads.filter(d=>downloadItems.has(d.id)).map(d=>d.webContentsId));
      if(!tabs.includes(tab)||tab.view?.webContents!==wc||!eligible(tab,active,latestBusy,Date.now()))continue;
      tab.lazy=true;tab.loading=false;tab.error='';tab.viewCorrupted=false;
      removeView(tab);count++;
    }
    if(count){send();save();log?.write('AUTO_MEMORY_SAVED',{count});notice(`Ahorro de memoria: ${count} pestaña(s) inactiva(s) en reposo.`)}
    return {suspended:count};
  }finally{memorySweepRunning=false}
}
function runtimeDiagnostics(){
  let performance={memoryMB:null,cpuPercent:null,processes:0};
  try{performance=sampleProcessMetrics(app.getAppMetrics?.()||[])}catch{}
  return {tabCount:tabs.length,liveTabs:tabs.filter(t=>t.view&&!t.view.webContents.isDestroyed()).length,
    suspendedTabs:tabs.filter(t=>t.lazy).length,privateTabs:tabs.filter(t=>t.private).length,
    activeDownloads:downloadItems.size,processMemoryMB:performance.memoryMB,processCPUPercent:performance.cpuPercent,
    processes:performance.processes,
    logging:'local, sin URLs ni contenido web',automaticSuspension:Boolean(data.settings.autoSleepTabs)};
}
function suggest(query){
  return localSuggestions(query,data.bookmarks,data.history,8);
}

if (app.requestSingleInstanceLock()) {
app.on('second-instance',()=>{
  if(win&&!win.isDestroyed()){if(win.isMinimized())win.restore();win.focus()}
});
// No hay <webview> en Gravity; bloquear cualquier intento futuro de adjuntar uno.
app.on('web-contents-created',(_event,contents)=>{
  contents.on('will-attach-webview',event=>event.preventDefault());
});
app.whenReady().then(()=>{
  const userData=app.getPath('userData');
  log=createLocalDiagnostics(path.join(userData,'diagnostico'));
  crashMarker=makeCrashMarker(userData);
  try{previousUncleanExit=crashMarker.begin()}catch{log.write('PROFILE_WRITE_ERROR')}
  log.write('APP_START');
  loadProfile();
  shieldsFile=path.join(userData,'gravity-shields-rules.json');
  shields=createShields({rules:readRules(shieldsFile),
    enabled:()=>Boolean(data.settings.blockTrackers),
    blockCrossSiteCookies:()=>Boolean(data.settings.blockThirdPartyCookies),
    excepted:shieldsExcepted,
    onBlocked:details=>{
      const tab=tabs.find(t=>t.view?.webContents.id===details.webContentsId);
      if(tab){tab.blocked++;if(tab.blocked<=3||tab.blocked%10===0)setTimeout(send,50)}
    }
  });
  normalProfile=configureSession(NORMAL_PARTITION);
  memorySweepTimer=setInterval(()=>{void autoSleepIdleTabs().catch(()=>log?.write('AUTO_MEMORY_SAVER_ERROR'))},60*1000);
  memorySweepTimer.unref?.();
  vaultInstance=vault(userData,safeStorage);
  updateService=createUpdateService({app,dialog,getWindow:()=>win,hasPendingDownloads:()=>downloadItems.size>0,
    saveProfile:()=>writeProfile(),notice,log});
  win=new BrowserWindow({
    width:1500,height:960,minWidth:1000,minHeight:680,frame:false,title:'Gravity',
    icon:path.join(__dirname,'app/assets/gravity.png'),backgroundColor:'#050607',autoHideMenuBar:true,
    webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,webviewTag:false}
  });
  win.loadFile('app/index.html');
  win.webContents.setWindowOpenHandler(({url})=>{if(isWebURL(url))setImmediate(()=>create(url));return {action:'deny'}});
  win.webContents.on('will-navigate',e=>e.preventDefault());
  win.webContents.on('before-input-event',(e,input)=>{if(input.type==='keyDown'&&shortcut(input))e.preventDefault()});
  win.webContents.once('did-finish-load',()=>{
    const saved=data.settings.restoreTabs?data.restore.filter(x=>x&&typeof x.url==='string'&&(isWebURL(x.url)||x.url===HOME)).slice(0,MAX_TABS):[];
    if(saved.length){
      // Restaurar en lote evita hasta 30 repintados completos de la barra de pestañas.
      deferUI=true;try{saved.forEach(t=>create(t.url,false,true,restoreMeta(t,data.tabGroups)))}finally{deferUI=false}
      select(tabs[Math.min(data.restoreActive,tabs.length-1)].id);
    }else create();
    sendDownloads(true);
    if(!data.settings.blockTrackers)notice('Tu perfil antiguo conserva el bloqueo desactivado. Puedes activar Escudos en Menú → Ajustes de Gravity.');
    if(!updateServiceStarted){updateServiceStarted=true;updateService?.start()}
    scheduleFilterRefresh();
    if(['backup','legacy-backup'].includes(recoverySource))notice('Gravity recuperó tus datos desde una copia de respaldo.');
    else if(recoverySource==='empty'&&fs.existsSync(dataFile))notice('El perfil anterior no pudo leerse. Se conservó una copia para revisión.');
    if(previousUncleanExit){log?.write('PREVIOUS_UNCLEAN_EXIT');notice('Gravity detectó un cierre inesperado anterior. Se restauraron las pestañas normales guardadas.')} 
  });
  win.webContents.on('render-process-gone',(_e,details)=>{
    log?.write('UI_RENDERER_CRASH',{reason:details?.reason||'unknown',scope:'app'});
    if(!uiRestartAttempted&&!win.isDestroyed()){
      uiRestartAttempted=true;setTimeout(()=>{if(win&&!win.isDestroyed())win.webContents.reload()},900);
    }
  });
  win.on('resize',bounds);
  win.on('close',event=>{
    const pending=downloads.filter(d=>downloadItems.has(d.id));
    if(pending.length && !closingConfirmed){
      // No cancelar silenciosamente descargas si se cierra Gravity por accidente.
      event.preventDefault();
      if(closeConfirmationPending)return;
      closeConfirmationPending=true;
      dialog.showMessageBox(win,{
        type:'question',message:`Hay ${pending.length} descarga(s) en curso`,
        detail:'Si cierras Gravity, las descargas en curso se interrumpirán. Puedes conservar el navegador abierto.',
        buttons:['Continuar descargando','Cerrar Gravity'],defaultId:0,cancelId:0,noLink:true
      }).then(answer=>{
        closeConfirmationPending=false;
        if(answer.response===1 && win && !win.isDestroyed()){
          closingConfirmed=true;win.close();
        }
      }).catch(()=>{closeConfirmationPending=false});
      return;
    }
    if(data.settings.clearSiteDataOnExit&&!siteCleanupCompleted){
      event.preventDefault();
      if(siteCleanupPending)return;
      siteCleanupPending=true;
      void Promise.allSettled([normalProfile.clearStorageData(),normalProfile.clearCache()]).then(results=>{
        const failed=results.some(x=>x.status==='rejected');
        if(failed){log?.write('PROFILE_CLEANUP_ERROR');notice('No fue posible borrar todos los datos del sitio al salir.');}
      }).finally(()=>{
        siteCleanupCompleted=true;siteCleanupPending=false;
        if(win&&!win.isDestroyed())win.close();
      });
      return;
    }
    // Guarda antes de destruir las vistas y cancela el guardado diferido pendiente.
    clearTimeout(writeTimer);
    if(writeProfile()){log?.write('APP_CLEAN_EXIT');crashMarker?.clean()}
  });
  win.on('closed',()=>{
    if(memorySweepTimer){clearInterval(memorySweepTimer);memorySweepTimer=null}
    if(filterRefreshTimer){clearTimeout(filterRefreshTimer);filterRefreshTimer=null}
    updateService?.stop();
    // Evitar que un guardado retrasado reemplace la sesión por una lista vacía.
    clearTimeout(writeTimer);
    for(const tab of tabs){popupPolicy.closeOpener(tab.id);if(tab.view&&!tab.view.webContents.isDestroyed())tab.view.webContents.close()}
    tabs=[];win=null;
  });

  ipcMain.handle('gravity-crop-save',async(event,raw)=>{
    if(!cropWindow||!cropImage||cropWindow.isDestroyed()||event.sender!==cropWindow.webContents||event.senderFrame!==cropWindow.webContents.mainFrame)
      throw Error('Editor de captura no autorizado');
    const size=cropImage.getSize(),rect=cropRect(raw,size.width,size.height);
    const sliced=cropImage.crop(rect);
    const result=await saveScreenshot(sliced,'Gravity-region');
    if(result.saved&&!cropWindow.isDestroyed())cropWindow.close();
    return result;
  });
  ipcMain.handle('command',async(event,action,value)=>{
    if(!win||event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame)throw Error('Emisor no autorizado');
    const tab=current(),wc=tab?.view?.webContents;
    switch(action){
      case 'state':return snapshot();
      case 'about':return {version:app.getVersion(),electron:process.versions.electron||'',chromium:process.versions.chrome||'',profile:SELECTED_PROFILE.name,platform:process.platform,channel:'BETA PRIVACIDAD (no publicada)',updates:updateService?.status().state||'no configuradas'};
      case 'checkUpdates':return updateService?.check(true)||{enabled:false,state:'sin configurar'};
      case 'diagnostics':return runtimeDiagnostics();
      case 'diagnosticsFolder':return shell.openPath(path.join(app.getPath('userData'),'diagnostico'));
      case 'navigate':{
        const target=normalize(value);
        if(target!==HOME&&!await confirmSiteRisk(target))return false;
        navigate(tab,target);break;
      }
      case 'shieldsStatus':return {enabled:Boolean(data.settings.blockTrackers),crossSiteCookies:Boolean(data.settings.blockThirdPartyCookies),
        rules:shields?.rulesCount()||0,customRules:readRules(shieldsFile).length};
      case 'updateFilterLists':return updatePublicFilterLists();
      case 'searchUniversal':{
        const query=String(value||'').trim().slice(0,220);
        if(!query)throw Error('Escribe qué deseas buscar');
        if(tabs.length>MAX_TABS-3)throw Error('Cierra algunas pestañas para abrir tres buscadores');
        for(const engine of ['duckduckgo','google','bing'])create(ENGINES[engine](query),Boolean(current()?.private));
        return true;
      }
      case 'new':create();break;
      case 'newPrivate':create(HOME,true);break;
      case 'select':select(String(value));break;
      case 'close':closeTab(String(value));break;
      case 'restoreClosed':restoreClosed();break;
      case 'togglePin':return pinCurrentTab();
      case 'createTabGroup':return createTabGroup(value);
      case 'setTabGroup':return setCurrentTabGroup(value);
      case 'deleteTabGroup':return deleteTabGroup(value);
      case 'profilesList':return {active:SELECTED_PROFILE.id,profiles:profiles.available(PROFILE_ROOT)};
      case 'profileCreate':return profiles.create(PROFILE_ROOT,value);
      case 'profileSwitch':return switchProfile(value);
      case 'vaultList':{const listing=vaultInstance.list();const origin=current()?.private?'':originFor(current()?.url||'');
        return {...listing,entries:listing.entries.filter(row=>origin&&row.origin===origin)};}
      case 'vaultAdd':return addCredential(value);
      case 'vaultRemove':return removeCredential(value);
      case 'vaultCopy':return copyCredential(value);
      case 'translatePage':return translateCurrentPage(value);
      case 'readerMode':return openReaderMode();
      case 'screenshot':return captureCurrentPage(value);
      case 'reorder':{
        const index=tabs.findIndex(t=>t.id===String(value?.id));const to=Number(value?.to);
        if(index<0||!Number.isInteger(to)||to<0||to>=tabs.length)break;
        if(clampReorder(tabs,String(value.id),to)){send();save()}break;
      }
      case 'home':navigate(tab,HOME);break;
      case 'back':if(wc?.navigationHistory.canGoBack())wc.navigationHistory.goBack();break;
      case 'forward':if(wc?.navigationHistory.canGoForward())wc.navigationHistory.goForward();break;
      case 'reload':recoverPage(tab);break;
      case 'stop':wc?.stop();break;
      case 'mute':if(wc){wc.setAudioMuted(!wc.isAudioMuted());send()}break;
      case 'min':win.minimize();break;
      case 'max':win.isMaximized()?win.unmaximize():win.maximize();break;
      case 'quit':win.close();break;
      case 'overlay':overlay=Boolean(value);if(tab)select(tab.id);break;
      case 'bounds':top=Math.max(80,Math.min(380,Number(value)||106));bounds();break;
      case 'bookmark':toggleBookmark(tab);break;
      case 'removeBookmark':commitBookmarks(data.bookmarks.filter(x=>x.url!==value));break;
      case 'clearHistory':{
        const choice=await dialog.showMessageBox(win,{message:'¿Borrar el historial local?',buttons:['Cancelar','Borrar'],defaultId:0,cancelId:0});
        if(choice.response===1){data.history=[];save();send()}break;
      }
      case 'addShortcut':{
        if(data.shortcuts.length>=5)throw Error('Máximo de cinco accesos adicionales');
        const name=String(value?.name||'').trim().slice(0,24),url=normalize(value?.url);
        if(!name||!isWebURL(url))throw Error('Nombre o dirección no válidos');
        data.shortcuts.push({id:randomUUID(),name,url});save();send();break;
      }
      case 'removeShortcut':data.shortcuts=data.shortcuts.filter(x=>x.id!==value);save();send();break;
      case 'clearSites':{
        const choice=await dialog.showMessageBox(win,{message:'¿Borrar cookies, caché, almacenamiento y permisos?',detail:'Se cerrarán sesiones de sitios. Tus favoritos e historial no se borrarán.',buttons:['Cancelar','Borrar'],defaultId:0,cancelId:0});
        if(choice.response===1){permissionSet(NORMAL_PARTITION).clear();await normalProfile.clearStorageData();await normalProfile.clearCache();notice('Datos de sitios borrados. Recarga las páginas abiertas.');send()}break;
      }
      case 'clearPermissions':permissionSet(NORMAL_PARTITION).clear();permissionSet(privatePartition).clear();send();notice('Permisos temporales revocados');break;
      case 'zoom':if(wc)wc.setZoomFactor(Math.max(.5,Math.min(2,wc.getZoomFactor()+Number(value||0))));break;
      case 'zoomReset':wc?.setZoomFactor(1);break;
      case 'print':if(wc)wc.print({silent:false,printBackground:true});break;
      case 'find':if(wc&&typeof value?.query==='string'&&value.query.trim())wc.findInPage(value.query.slice(0,250),{forward:value.forward!==false,findNext:Boolean(value.next)});break;
      case 'stopFind':wc?.stopFindInPage('clearSelection');break;
      case 'suggest':return suggest(value);
      case 'exportBookmarks':return exportBookmarks();
      case 'importBookmarks':return importBookmarks();
      case 'duplicateTab':return duplicateCurrentTab();
      case 'copyTabURL':return copyCurrentURL();
      case 'exportTabSet':return exportTabSet();
      case 'importTabSet':return importTabSet();
      case 'savePagePDF':return saveCurrentPagePDF();
      case 'sleepInactive':return sleepInactive();
      case 'settings':{
        if(value?.key==='clearSiteDataOnExit'&&value.value===true&&!data.settings.clearSiteDataOnExit){
          const consent=await dialog.showMessageBox(win,{
            type:'warning',message:'¿Borrar cookies y datos web al salir?',
            detail:'Esto eliminará cookies, caché y almacenamiento web del perfil normal al cerrar Gravity. Tendrás que volver a iniciar sesión en Gmail, YouTube y otros servicios. Los favoritos e historial seguirán guardados. No borra información almacenada por las páginas en servidores externos.',
            buttons:['Cancelar','Activar limpieza local'],defaultId:0,cancelId:0,noLink:true
          });
          if(consent.response!==1)return false;
        }
        if(value?.key==='autoSleepTabs'&&value.value===true&&!data.settings.autoSleepTabs){
          const consent=await dialog.showMessageBox(win,{
            type:'question',message:'¿Activar ahorro de memoria automático?',
            detail:'Solo se intentará poner en reposo páginas simples tras 30 minutos sin usarlas. Se omiten pestañas fijadas, privadas, con multimedia, formularios, descargas y servicios sensibles. Ningún detector puede garantizar proteger todo el estado de aplicaciones web. Desactivado por defecto.',
            buttons:['Mantener desactivado','Activar bajo mi responsabilidad'],defaultId:0,cancelId:0,noLink:true
          });
          if(consent.response!==1)return false;
        }
        saveSettings(value);break;
      }
      case 'downloadAction':await downloadAction(String(value?.action),String(value?.id));break;
      case 'downloadFolder':shell.openPath(app.getPath('downloads')).then(result=>{if(result)notice(result)});break;
      default:throw Error('Comando desconocido');
    }
    return true;
  });
}).catch(error=>{console.error('Gravity no pudo iniciar:',error);app.quit()});
} else {app.quit()}
app.on('window-all-closed',()=>app.quit());
app.on('child-process-gone',(_event,details)=>log?.write('CHILD_PROCESS_FAILURE',{reason:details?.reason||'unknown',scope:'app'}));
process.on('uncaughtExceptionMonitor',()=>log?.write('UNCAUGHT_EXCEPTION'));
// No registrar un handler de unhandledRejection: hacerlo alteraría la política fatal por defecto de Node.
