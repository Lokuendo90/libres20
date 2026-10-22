'use strict';
// Funciona ÚNICAMENTE sobre el aviso "Vídeo en pausa, ¿seguir viendo?" de YouTube.
// No reinicia pausas manuales, no maneja CAPTCHA ni modifica reproductores de otros sitios.
function isYouTubeWatchUrl(raw){
  try{
    const url=new URL(raw);
    return url.protocol==='https:'&&
      ['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com'].includes(url.hostname)&&
      url.pathname==='/watch';
  }catch{return false}
}
function pageSideContinuity(){
  if(window.__gravityYoutubeContinueInstalled===true)return false;
  window.__gravityYoutubeContinueInstalled=true;
  const pauseText=/(?:\bvideo\b|vídeo).{0,65}(?:en pausa|pausado|paused)|(?:continue|still)\s+watching|(?:sigues|seguir)\s+(?:mirando|viendo|escuchando)/i;
  let pending=false;
  function visible(element){
    try{return Boolean(element&&element.getClientRects().length)}catch{return false}
  }
  function examine(){
    pending=false;
    // YouTube usa el contenedor de confirmación para este mensaje.
    const dialogs=document.querySelectorAll('yt-confirm-dialog-renderer, ytd-confirm-dialog-renderer');
    for(const dialog of dialogs){
      if(!visible(dialog))continue;
      const message=(dialog.querySelector('#message')?.textContent||dialog.textContent||'').trim().slice(0,1000);
      if(!pauseText.test(message))continue;
      const button=dialog.querySelector('#confirm-button button, yt-button-renderer#confirm-button button, button[aria-label="Yes"], button[aria-label="Sí"]');
      if(!button||button.disabled||!visible(button))continue;
      button.click();return;
    }
  }
  function schedule(){
    if(pending)return;
    pending=true;setTimeout(examine,650);
  }
  const root=document.documentElement;
  if(!root)return false;
  new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
  // Respaldo cuando el sitio actualiza el diálogo sin crear nodos nuevos.
  setInterval(examine,12000);
  schedule();
  return true;
}
const YOUTUBE_CONTINUITY_SCRIPT=`(${pageSideContinuity.toString()})()`;
async function installYouTubeContinuity(wc,url){
  if(!isYouTubeWatchUrl(url)||!wc||wc.isDestroyed?.())return false;
  try{
    // Mundo aislado: el sitio no necesita leer los indicadores internos de Gravity.
    if(typeof wc.executeJavaScriptInIsolatedWorld==='function')
      await wc.executeJavaScriptInIsolatedWorld(1001,[{code:YOUTUBE_CONTINUITY_SCRIPT}],false);
    else await wc.executeJavaScript(YOUTUBE_CONTINUITY_SCRIPT,false);
    return true;
  }catch{return false}
}
module.exports={isYouTubeWatchUrl,YOUTUBE_CONTINUITY_SCRIPT,installYouTubeContinuity};
