'use strict';
// Avisos heurísticos, NO servicio completo de reputación contra phishing.
const OFFICIAL=new Map([
  ['youtube',['youtube.com','youtu.be']],['facebook',['facebook.com']],
  ['google',['google.com','google.es','google.com.pe']],['gmail',['google.com']],
  ['whatsapp',['whatsapp.com']],['instagram',['instagram.com']],
  ['microsoft',['microsoft.com','microsoftonline.com']],['apple',['apple.com']],
  ['paypal',['paypal.com']],['amazon',['amazon.com']],['netflix',['netflix.com']]
]);
function hostMatch(host,domain){return host===domain||host.endsWith('.'+domain)}
function assessWebsite(raw){
  try{
    const uri=new URL(raw);if(!['http:','https:'].includes(uri.protocol))return {warn:false,reasons:[]};
    const host=uri.hostname.toLowerCase(),reasons=[];
    if(host.includes('xn--'))reasons.push('Este dominio utiliza codificación internacionalizada (punycode). Comprueba el nombre antes de ingresar datos.');
    if(/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host)&&!/^127\./.test(host))reasons.push('El sitio se abre directamente mediante una dirección IP. Verifica su procedencia.');
    for(const [brand,official] of OFFICIAL){
      if(official.some(d=>hostMatch(host,d)))continue;
      if(new RegExp(`(?:^|[.-])${brand}(?:[.-]|$)`).test(host) && /(?:login|verify|security|account|secure|support|signin|auth)/.test(host)){
        reasons.push(`El dominio utiliza el nombre «${brand}» junto con términos de acceso o verificación, pero no corresponde a uno de sus dominios oficiales conocidos.`);
        break;
      }
    }
    return {warn:reasons.length>0,reasons,host};
  }catch{return {warn:false,reasons:[]}}
}
module.exports={assessWebsite};
