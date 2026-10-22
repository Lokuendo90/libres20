'use strict';
// Cuota de ventanas reales y de solicitudes. No modifica el motor web ni la interfaz.
// Reserva antes de autorizar Electron y libera cuando se cierra el popup.
function createPopupPolicy({maxGlobal=4,maxPerOpener=2,maxRequestsPerMinute=8,
  windowMs=60_000,pendingMs=12_000,now=Date.now}={}) {
  const reservations=new Map(), recent=new Map();
  let serial=0;
  function release(token) {return reservations.delete(token)}
  function purge() {
    const current=now();
    for(const [id,record] of reservations)
      if(!record.window && current-record.created>=pendingMs)release(id);
    for(const [opener,requests] of recent){
      const valid=requests.filter(time=>current-time<windowMs);
      if(valid.length)recent.set(opener,valid);else recent.delete(opener);
    }
  }
  function reserve(opener) {
    purge();const id=String(opener),count=[...reservations.values()].filter(x=>x.opener===id).length;
    const times=recent.get(id)||[];
    if(reservations.size>=maxGlobal||count>=maxPerOpener||times.length>=maxRequestsPerMinute)
      return {allowed:false,reason:'Límite de ventanas emergentes alcanzado'};
    const token=++serial;
    reservations.set(token,{opener:id,created:now(),window:null});
    recent.set(id,[...times,now()]);
    return {allowed:true,token};
  }
  function attach(opener,popup) {
    purge();
    const matching=[...reservations].find(([,record])=>record.opener===String(opener)&&!record.window);
    if(!matching)return false;
    const [token,record]=matching;record.window=popup;
    popup.once('closed',()=>release(token));
    return true;
  }
  function closeOpener(opener) {
    for(const [token,record] of reservations){
      if(record.opener!==String(opener))continue;
      if(record.window){
        try{if(!record.window.isDestroyed?.())record.window.close()}catch{}
        // Evitar popups privados huérfanos si la página cancela el cierre.
        try{if(!record.window.isDestroyed?.())record.window.destroy?.()}catch{}
      }
      release(token);
    }
    recent.delete(String(opener));
  }
  function stats(){purge();return {reserved:reservations.size,open:[...reservations.values()].filter(x=>Boolean(x.window)).length,trackedOpeners:recent.size}}
  return {reserve,attach,closeOpener,release,stats};
}
module.exports={createPopupPolicy};
