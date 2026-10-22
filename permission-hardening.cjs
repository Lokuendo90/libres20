'use strict';
// Verifica que diferentes campos enviados por Chromium correspondan al mismo origen.
// Previene que un iframe solicite un privilegio afirmando ser otra página.
const {safeOrigin,permissionContext}=require('./security-policy.cjs');
function requestPermissionContext(webContentsURL, permission, details={}){
  const fields=[details.requestingUrl,details.securityOrigin,details.requestingOrigin]
    .filter(value=>typeof value==='string'&&value.length);
  const origins=fields.map(safeOrigin);
  if(origins.some(x=>!x)||new Set(origins).size>1)return {allowed:false,origin:''};
  const origin=origins[0] || safeOrigin(webContentsURL);
  if(!origin)return {allowed:false,origin:''};
  return permissionContext(origin,permission);
}
function checkPermissionContext(requestingOrigin,permission,details={}){
  const origin=safeOrigin(requestingOrigin||details.requestingUrl||details.securityOrigin);
  if(!origin)return {allowed:false,origin:''};
  const references=[details.requestingUrl,details.securityOrigin]
    .filter(value=>typeof value==='string'&&value.length);
  if(references.some(value=>safeOrigin(value)!==origin))return {allowed:false,origin:''};
  return permissionContext(origin,permission);
}
module.exports={requestPermissionContext,checkPermissionContext};
