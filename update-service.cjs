'use strict';
// Preparación del servicio de actualización NSIS: desactivado hasta tener editor,
// instalador firmado, canal HTTPS y pruebas reales. NO usa el perfil del navegador.
const {validateChannel}=require('./release-channel.cjs');
const config=require('./release-channel.json');
const pkg=require('./package.json');
const INTERVAL_MS=6*60*60*1000;
function createUpdateService({app,dialog,getWindow,hasPendingDownloads,saveProfile,notice,log,
  updaterFactory=()=>require('electron-updater').autoUpdater,platform=process.platform,channel=config,
  builderPublisher=pkg.build?.win?.publisherName}={}){
  const result=validateChannel(channel,{isPackaged:app?.isPackaged===true,platform,
    builderPublisher});
  let updater=null,timer=null,pending=false,checking=false,downloading=false,installed=false,started=false;
  const report=name=>{try{log?.write(name)}catch{}};
  function status(){return {enabled:result.ready&&started,state:result.ready?(started?(pending?'descargada':checking?'comprobando':downloading?'descargando':'lista'):'pendiente'):'sin configurar'}}
  async function offerInstall(){
    if(!pending||installed)return false;
    const win=getWindow?.();
    if(!win||win.isDestroyed()||hasPendingDownloads?.())return false;
    try{
      const selection=await dialog.showMessageBox(win,{
        type:'question',message:'Actualización verificada y descargada',
        detail:'Gravity puede reiniciarse para instalar una actualización oficial. Guarda primero cualquier formulario o trabajo que tengas abierto.',
        buttons:['Ahora no','Guardar y reiniciar'],defaultId:0,cancelId:0,noLink:true
      });
      if(selection.response!==1||!pending||hasPendingDownloads?.())return false;
      if(!saveProfile?.()){notice?.('No se pudo guardar el perfil. Se pospuso la actualización.');return false}
      installed=true;updater.quitAndInstall(false,true);
      return true;
    }catch{report('UPDATE_ERROR');return false}
  }
  async function check(manual=false){
    if(!result.ready||!started)return {enabled:false,reason:result.reason||'El servicio aun no esta listo.'};
    if(checking||downloading||pending)return {enabled:true,state:status().state};
    checking=true;
    try{
      report('UPDATE_CHECK');
      await updater.checkForUpdates();
      return {enabled:true,state:'comprobación iniciada'};
    }catch{
      report('UPDATE_ERROR');if(manual)notice?.('No se pudo comprobar el canal de actualizaciones.');
      return {enabled:true,state:'error'};
    }finally{checking=false}
  }
  function start(){
    if(!result.ready)return status();
    try{
      updater=updaterFactory();
      if(!updater||typeof updater.checkForUpdates!=='function'||typeof updater.setFeedURL!=='function')throw Error('Motor de actualizaciones no disponible');
      updater.autoDownload=true;
      updater.autoInstallOnAppQuit=false;
      updater.allowPrerelease=false;
      updater.allowDowngrade=false;
      // Evitar que rutas/URLs del servicio acaben en la consola o en diagnósticos.
      updater.logger={info(){},warn(){},error(){},debug(){}};
      updater.setFeedURL({provider:'generic',url:result.url});
      updater.on('error',()=>{checking=false;downloading=false;report('UPDATE_ERROR')});
      updater.on('update-available',()=>{downloading=true;report('UPDATE_AVAILABLE')});
      updater.on('update-not-available',()=>{downloading=false;checking=false});
      updater.on('update-downloaded',()=>{
        checking=false;downloading=false;pending=true;report('UPDATE_DOWNLOADED');
        void offerInstall();
      });
      const first=setTimeout(()=>{void check()},90000);first.unref?.();
      timer=setInterval(()=>{if(pending)void offerInstall();else void check()},INTERVAL_MS);
      timer.unref?.();
      started=true;return status();
    }catch{started=false;report('UPDATE_ERROR');return {enabled:false,state:'error de configuración'}}
  }
  function stop(){if(timer)clearInterval(timer);timer=null}
  return {start,stop,check,status,offerInstall,configured:result};
}
module.exports={createUpdateService,INTERVAL_MS};
