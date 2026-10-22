'use strict';
const {contextBridge,ipcRenderer}=require('electron');
// Solo el editor local obtiene este puente; jamás se instala en páginas remotas.
contextBridge.exposeInMainWorld('gravityCrop',{
  onImage:fn=>{
    if(typeof fn!=='function')return;
    ipcRenderer.once('gravity-crop-image',(_event,data)=>fn(data));
  },
  save:rect=>ipcRenderer.invoke('gravity-crop-save',rect)
});
