'use strict';
// Protección local de descargas: nombres compatibles con Windows y advertencia antes de recibir ejecutables.
// No analiza malware y NO debe presentarse como un antivirus.
const path = require('node:path');
const EXECUTABLE_EXTENSIONS = new Set([
  '.exe','.msi','.msp','.msix','.msixbundle','.appinstaller','.bat','.cmd',
  '.ps1','.psm1','.vbs','.vbe','.wsf','.wsh','.js','.jse','.jar','.scr',
  '.com','.pif','.lnk','.url','.hta','.reg','.chm','.cpl','.iso','.img'
]);
// Los controles bidi pueden hacer que nombre-verdadero.exe parezca un .pdf.
const BIDI = /[\u202A-\u202E\u2066-\u2069]/g;
const HAS_BIDI = /[\u202A-\u202E\u2066-\u2069]/;
const CONTROL = /[\x00-\x1f\x7f]/g;
const INVALID = /[<>:"/\\|?*]/g;
function baseFilename(value) {
  const input=String(value??'').slice(0,1024);
  return path.posix.basename(path.win32.basename(input));
}
function cleanDownloadFilename(value) {
  let name=baseFilename(value).replace(BIDI,'').replace(CONTROL,'').replace(INVALID,'_').replace(/[. ]+$/g,'').trim();
  if(!name || name==='.' || name==='..')name='descarga';
  if(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(name))name='_'+name;
  if(name.length>180){
    const ext=path.extname(name).slice(0,25);
    name=name.slice(0,180-ext.length).replace(/[. ]+$/g,'')+ext;
  }
  return name;
}
function isDangerousDownload(value) {
  const original=baseFilename(value);
  const cleaned=cleanDownloadFilename(original);
  // Controles invisibles: advertir también si la extensión aparente no es ejecutable.
  return HAS_BIDI.test(original) || EXECUTABLE_EXTENSIONS.has(path.extname(cleaned).toLowerCase());
}
function chooseDangerousDownload(item, win, dialog, notice=()=>{}) {
  let filename;
  try{filename=item.getFilename()}catch{filename='descarga'}
  if(!isDangerousDownload(filename))return true;
  if(!win || win.isDestroyed() || typeof dialog?.showMessageBoxSync!=='function'){
    item.cancel();notice('Se canceló una descarga potencialmente ejecutable sin confirmación.');return false;
  }
  let confirmed=false;
  try{
    const answer=dialog.showMessageBoxSync(win,{
      type:'warning',message:'Descarga de archivo potencialmente peligroso',
      detail:`${cleanDownloadFilename(filename)}\n\nEste archivo puede ejecutar código. Si contiene malware, podría robar contraseñas, espiar información, cifrar documentos o instalar programas sin permiso.\n\nGravity puede solicitar un análisis a Microsoft Defender en Windows, pero ningún análisis garantiza seguridad total. Descarga solo si reconoces la fuente.`,
      buttons:['Cancelar descarga','Descargar bajo mi responsabilidad'],defaultId:0,cancelId:0,noLink:true
    });
    confirmed=answer===1;
  }catch{}
  if(!confirmed){item.cancel();notice('Descarga cancelada por seguridad.');}
  return confirmed;
}
module.exports={EXECUTABLE_EXTENSIONS,baseFilename,cleanDownloadFilename,isDangerousDownload,chooseDangerousDownload};
