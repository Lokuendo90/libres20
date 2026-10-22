'use strict';
// Medida complementaria, específica de anuncios que YouTube marca en el reproductor.
// No intercepta sesiones/cookies/captcha ni modifica el HTML global de Gravity.
function isYoutubeVideoPage(raw){
  try{const u=new URL(raw);return u.protocol==='https:'&&
    ['www.youtube.com','youtube.com','m.youtube.com','music.youtube.com'].includes(u.hostname)&&
    (u.pathname==='/watch'||u.pathname.startsWith('/shorts/'));}
  catch{return false;}
}
function installAdHandlingOnPage(){
  if(window.__gravityYoutubeAdHandler)return false;
  window.__gravityYoutubeAdHandler=true;
  let lastVideo=null,restoration=null,intervalId;
  const buttons=[
    '.ytp-skip-ad-button', '.ytp-ad-skip-button', '.ytp-ad-skip-button-modern',
    '.ytp-ad-skip-button-container button', '.videoAdUiSkipButton',
    'button.ytp-ad-skip-button', '.ytp-ad-skip-button-slot button'
  ].join(',');
  const visible=(el)=>{
    try{return Boolean(el&&!el.disabled&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden')}
    catch{return false}
  };
  function restoreAudio(){
    const old=restoration;restoration=null;
    if(!old||!old.video?.isConnected)return;
    // Si el usuario cambió manualmente el silencio o la velocidad, respetarlo.
    try{if(old.mutedByUs&&old.video.muted)old.video.muted=old.originalMuted;
        if(old.speedByUs&&old.video.playbackRate===8)old.video.playbackRate=old.originalSpeed;}
    catch{}
  }
  function check(){
    const player=document.querySelector('#movie_player, .html5-video-player');
    const ad=Boolean(player?.classList.contains('ad-showing'));
    if(!ad){restoreAudio();return;}
    const skip=[...document.querySelectorAll(buttons)].find(visible);
    if(skip){skip.click();return;}
    const video=player.querySelector('video.html5-main-video')||player.querySelector('video');
    if(!video)return;
    if(restoration?.video!==video){restoreAudio();restoration={video,originalMuted:video.muted,originalSpeed:video.playbackRate,mutedByUs:false,speedByUs:false};}
    // Si el anuncio no puede omitirse aún, evitar reproducir su audio al usuario.
    try{
      if(!video.muted){video.muted=true;restoration.mutedByUs=true;}
      // Saltar solo dentro de un bloque publicitario identificado. Si no es posible buscar
      // (en directo, servidor, etc.), dejar el vídeo en estado consistente.
      if(Number.isFinite(video.duration)&&video.duration>1&&video.seekable?.length){
        const last=video.seekable.end(video.seekable.length-1);
        if(Number.isFinite(last)&&last>video.currentTime+0.75){
          video.currentTime=Math.max(0,Math.min(last-0.12,video.duration-0.12));
        }
      }
      // Acelerar anuncios que no admitan salto y permitan cambio de velocidad.
      if(video.playbackRate<8){video.playbackRate=8;restoration.speedByUs=true;}
    }catch{}
  }
  function destroy(){restoreAudio();if(intervalId)clearInterval(intervalId);}
  window.addEventListener('pagehide',destroy,{once:true});
  // Intervalo moderado: MutationObserver sin throttling puede saturar YouTube.
  intervalId=setInterval(check,900);
  check();
  return true;
}
const YOUTUBE_AD_HANDLER_SCRIPT=`(${installAdHandlingOnPage.toString()})()`;
async function installYoutubeAdHandler(wc,url){
  if(!isYoutubeVideoPage(url)||!wc||wc.isDestroyed?.())return false;
  try{
    if(typeof wc.executeJavaScriptInIsolatedWorld==='function')
      await wc.executeJavaScriptInIsolatedWorld(1002,[{code:YOUTUBE_AD_HANDLER_SCRIPT}],false);
    else await wc.executeJavaScript(YOUTUBE_AD_HANDLER_SCRIPT,false);
    return true;
  }catch{return false;}
}
module.exports={isYoutubeVideoPage,YOUTUBE_AD_HANDLER_SCRIPT,installYoutubeAdHandler};
