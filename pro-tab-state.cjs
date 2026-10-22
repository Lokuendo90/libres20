'use strict';
// Herramientas puras para fijados y grupos. No modifica la UI ni el historial.
const MAX_GROUPS=12;
const MAX_GROUP_NAME=32;
function cleanGroup(value){
  if(typeof value!=='string')throw Error('Nombre de grupo inválido');
  const group=value.trim().replace(/\s+/g,' ');
  if(group.length>MAX_GROUP_NAME||/[\x00-\x1f<>\\\/]/.test(group))throw Error('Nombre de grupo no permitido (máximo 32 caracteres)');
  return group;
}
function sortedPinned(tabs){return [...tabs.filter(t=>t.pinned),...tabs.filter(t=>!t.pinned)]}
function clampReorder(tabs,id,to){
  const index=tabs.findIndex(t=>t.id===id);
  if(index<0||!Number.isInteger(to)||to<0||to>=tabs.length)return false;
  const moving=tabs[index];
  const fixed=tabs.filter(t=>t.pinned).length;
  const target=moving.pinned?Math.min(to,fixed-1):Math.max(to,fixed);
  const [entry]=tabs.splice(index,1);tabs.splice(target,0,entry);
  return true;
}
function validateGroup(group,existing){
  const result=cleanGroup(group);
  if(result&&!existing.includes(result)&&existing.length>=MAX_GROUPS)throw Error(`Máximo de ${MAX_GROUPS} grupos`);
  return result;
}
function restoreMeta(raw,groups){
  const group=typeof raw?.group==='string'&&groups.includes(raw.group)?raw.group:'';
  return {pinned:Boolean(raw?.pinned),group};
}
module.exports={MAX_GROUPS,cleanGroup,sortedPinned,clampReorder,validateGroup,restoreMeta};
