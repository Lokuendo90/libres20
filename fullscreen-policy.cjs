'use strict';
// Fullscreen normal, sin diálogos repetidos, pero sólo para el marco principal seguro.
// No se concede "automatic-fullscreen": Chromium sigue exigiendo la acción del usuario.
const {safeOrigin,isSecureOrigin}=require('./security-policy.cjs');
function shouldAllowFullscreen(permission,topUrl,origin='',details={}){
  if(permission!=='fullscreen')return false;
  const top=safeOrigin(topUrl);
  if(!top||!isSecureOrigin(top)||details?.isMainFrame===false||details?.userGesture===false)return false;
  // Rechazar iframes que afirman pertenecer a otro origen y solicitudes ambiguas.
  for(const source of [origin,details?.requestingUrl,details?.requestingOrigin,details?.securityOrigin]){
    if(typeof source==='string'&&source&&safeOrigin(source)!==top)return false;
  }
  return true;
}
module.exports={shouldAllowFullscreen};
