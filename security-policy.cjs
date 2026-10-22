'use strict';
// Política de permisos de duración limitada y URL seguras. No inspecciona contenidos ni registra sitios.
const SENSITIVE = new Set(['media','notifications','geolocation']);
const PERMISSIONS = new Set(['media','notifications','geolocation','fullscreen','clipboard-sanitized-write']);
const GRANT_TTL_MS = 30 * 60 * 1000;
const GRANT_LIMIT = 128;
function safeOrigin(input) {
  try {
    const url = new URL(input);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return '';
    return url.origin === 'null' ? '' : url.origin;
  } catch { return ''; }
}
function isSecureOrigin(origin) {
  try {
    const url = new URL(origin);
    if (url.protocol === 'https:') return true;
    return url.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  } catch {return false;}
}
function permissionContext(requestingUrl, permission, frameOrigin='') {
  const origin = safeOrigin(requestingUrl);
  if (!origin || !PERMISSIONS.has(permission)) return {allowed:false,origin:''};
  // Las API sensibles se autorizan solo en contextos seguros (o desarrollo localhost).
  if (SENSITIVE.has(permission) && !isSecureOrigin(origin)) return {allowed:false,origin};
  // Si Electron informa tanto el marco como su origen, ambos deben coincidir.
  if (frameOrigin && safeOrigin(frameOrigin)!==origin) return {allowed:false,origin};
  return {allowed:true,origin};
}
function createPermissionGrants(clock = Date.now) {
  const entries = new Map();
  const key = (origin,permission)=>`${origin}|${permission}`;
  function clean(){
    const now = clock();
    for (const [item,expires] of entries) if (expires <= now) entries.delete(item);
  }
  return {
    has(origin, permission) {clean();return Boolean(permissionContext(origin,permission).allowed) && entries.has(key(origin,permission));},
    allow(origin, permission) {
      const candidate=permissionContext(origin,permission);
      if(!candidate.allowed) return false;
      clean();
      if(entries.size>=GRANT_LIMIT&&!entries.has(key(origin,permission)))entries.delete(entries.keys().next().value);
      entries.set(key(origin,permission),clock()+GRANT_TTL_MS);return true;
    },
    clear(){entries.clear()},
    list(){clean();return Array.from(entries.keys())},
    get size(){clean();return entries.size}
  };
}
// No abrir protocolos locales ni esquemas ejecutables a través de navegación web.
function isAllowedWebNavigation(raw) {
  try { const url=new URL(raw);return ['https:','http:'].includes(url.protocol) && !url.username && !url.password; }
  catch {return false;}
}
module.exports={createPermissionGrants,permissionContext,safeOrigin,isSecureOrigin,isAllowedWebNavigation,GRANT_TTL_MS,PERMISSIONS};
