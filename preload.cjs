'use strict';
const {contextBridge,ipcRenderer}=require('electron');
const listen=(name,listener)=>{
  if(typeof listener!=='function')throw new TypeError('Listener inválido');
  const callback=(_event,value)=>listener(value);
  ipcRenderer.on(name,callback);
  return()=>ipcRenderer.removeListener(name,callback);
};
// Puente únicamente en la interfaz local. Los sitios externos no reciben preload.
contextBridge.exposeInMainWorld('gravity',{
  command:(action,value)=>ipcRenderer.invoke('command',action,value),
  onState:listener=>listen('state',listener),
  onNotice:listener=>listen('notice',listener),
  onFocus:listener=>listen('focus',listener),
  onDownloads:listener=>listen('downloads',listener),
  onFound:listener=>listen('found-in-page',listener),
  onUIAction:listener=>listen('ui-action',listener)
});
