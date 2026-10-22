'use strict';
// Marca una ejecución en curso sin conservar sitios ni datos de navegación.
const fs=require('node:fs');
const path=require('node:path');
function makeCrashMarker(folder){
  const file=path.join(folder,'gravity-run-marker.json');
  return {
    file,
    begin(){
      fs.mkdirSync(folder,{recursive:true});
      const previous=fs.existsSync(file);
      const temp=`${file}.${process.pid}.tmp`;
      fs.writeFileSync(temp,JSON.stringify({startedAt:new Date().toISOString(),pid:process.pid}),{mode:0o600,flag:'w'});
      fs.renameSync(temp,file);
      return previous;
    },
    clean(){try{fs.unlinkSync(file);return true}catch(e){return e.code==='ENOENT'}},
    exists(){return fs.existsSync(file)}
  };
}
module.exports={makeCrashMarker};
