const config = require('./manager-build-config.cjs').managerBuildConfig();
// Che Vení Concierge Beta V1: isolated Preview signup-request page.
// No account creation, no passwords, no Meta messages, no secrets in HTML.
const fs = require('node:fs');
const path = require('node:path');
const {legalPublicationGate} = require('./manager-legal-publication-gate-v1.cjs');
// Absent owner/legal/hosting approval or missing/mismatched pages => false.
// No approval manifest is installed in the Beta branch.
const legalPublication = legalPublicationGate(__dirname);
const dir = path.join(__dirname, 'dist', 'manager', 'activar');
fs.mkdirSync(dir, { recursive: true });
const html = String.raw`<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta name="robots" content="noindex,nofollow,noarchive">
<meta http-equiv="Cache-Control" content="no-store">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; object-src 'none'; img-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src ${config.apiOrigin}; form-action 'none'">
<title>Activar invitación · Che Vení Concierge Beta</title>
<style>
:root{font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#16302d;background:#f7f4ec}
*{box-sizing:border-box}body{margin:0;padding:22px;min-height:100vh;display:grid;place-items:center}
main{background:#fff;border:1px solid #e5ddd0;border-radius:18px;box-shadow:0 12px 32px #16302d12;max-width:560px;width:100%;padding:clamp(22px,5vw,40px)}
small{font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#0f766e}
h1{line-height:1.15;margin:12px 0;font-size:clamp(1.55rem,5vw,2rem)}
p{line-height:1.55;color:#52645f}
.field{margin:16px 0}label{display:block;font-weight:750;margin-bottom:7px}
input[type=text],input[type=email]{border:1px solid #aab9b4;background:#fff;border-radius:10px;font:inherit;padding:13px;width:100%;color:#16302d}
input:focus-visible,button:focus-visible,a:focus-visible{outline:3px solid #0f766e;outline-offset:2px}
.check{display:flex;align-items:flex-start;gap:10px;margin:18px 0}.check input{margin-top:5px;min-width:18px;min-height:18px}
.check label{font-size:.92rem;font-weight:500;margin:0}
button{width:100%;border:0;border-radius:12px;background:#0f766e;color:white;font:inherit;font-weight:800;padding:15px;cursor:pointer}
button:disabled{opacity:.55;cursor:wait}
a{color:#0f766e}ul{padding-left:21px;line-height:1.65;color:#52645f}
.notice{background:#edf6f4;border-radius:10px;padding:12px 15px;color:#16302d}
.status{margin-top:16px;font-weight:750;min-height:26px}.status.error{color:#9c2e28}
[hidden]{display:none!important}
</style></head><body><main>
<small>Che Vení Concierge · Beta privada</small>
<h1>Bienvenido a Che Vení Concierge</h1>
<p>Esta página es exclusivamente para managers invitados. La solicitud queda pendiente de aprobación: no habilita propiedades, huéspedes ni mensajes automáticos.</p>
<div id="no-invite" class="notice" role="status" hidden>Para continuar necesitás un enlace personal de invitación vigente. No hay registro público.</div>
<div id="legal-pending" class="notice" role="status" hidden>El registro privado de Concierge todavía está cerrado: falta revisar y publicar las condiciones y el aviso específico de privacidad. No ingreses datos personales por ahora. Tu enlace no activa ninguna cuenta.</div>
<form id="invite-form" hidden novalidate autocomplete="on">
 <div class="field"><label for="managerName">Nombre y apellido</label><input id="managerName" name="managerName" type="text" maxlength="100" minlength="2" autocomplete="name" required></div>
 <div class="field"><label for="email">Correo de invitación</label><input id="email" name="email" type="email" maxlength="254" autocomplete="email" required></div>
 <div class="field"><label for="businessName">Nombre comercial o del alojamiento</label><input id="businessName" name="businessName" type="text" maxlength="120" minlength="2" required></div>
 <div class="notice"><strong>Condiciones de esta Beta:</strong>
 <ul><li>30 días gratuitos desde la primera estadía real verificada. Al vencer, no se admiten nuevas estadías; las ya verificadas continúan hasta el checkout, salvo baja o revocación anterior justificada.</li>
 <li>No hay facturación ni conversión a pago automáticas.</li>
 <li>El primer piloto empieza con un manager y una propiedad en CABA; únicamente huéspedes principales verificados.</li>
 <li>No hay reemplazo automático de números ni acceso independiente para acompañantes.</li>
 <li>Las incidencias excepcionales requieren intervención humana; no se promete respuesta humana inmediata 24/7.</li>
 </ul></div>
 <div class="check"><input id="terms" type="checkbox" required><label for="terms">Leí y acepto las <a href="/manager/condiciones-concierge/" target="_blank" rel="noreferrer noopener">condiciones completas de la Beta privada de Concierge</a>, además del resumen indicado arriba.</label></div>
 <div class="check"><input id="privacy" type="checkbox" required><label for="privacy">Acepto que Che Vení procese estos datos para evaluar mi incorporación, conforme al <a href="/manager/privacidad-concierge/" target="_blank" rel="noreferrer noopener">aviso de privacidad específico de Concierge</a>.</label></div>
 <button id="submit" type="submit">Enviar solicitud de activación</button>
 <div id="form-status" class="status" aria-live="polite" role="status"></div>
</form>
<div id="outcome-notice" class="notice" hidden role="status" aria-live="polite"></div>
<div id="completed" class="notice" hidden role="status">Tu solicitud quedó registrada para revisión. Che Vení te contactará por el canal acordado cuando exista una decisión. Tu cuenta todavía no está activa.</div>
<p><a href="/manager/">Ya tengo una cuenta: iniciar sesión</a></p>
</main>
<script>
(function(){
'use strict';
var params = new URLSearchParams(window.location.hash.slice(1));
var token = params.get('invite') || '';
window.history.replaceState(null, '', window.location.pathname);
var form = document.getElementById('invite-form');
var noInvite = document.getElementById('no-invite');
var busy = false, terminal = false, generation = 0, controller = null;
var REVIEW_KEY = 'cheveni_manager_signup_review_v1';
function clearIntent() {
 try {
   if (sessionStorage.getItem(REVIEW_KEY) !== 'pending') return false;
   sessionStorage.removeItem(REVIEW_KEY);
   return sessionStorage.getItem(REVIEW_KEY) === null;
 } catch (_) { return false; }
}
function clearPrivateFields() {
 ['managerName','email','businessName'].forEach(function(id){ document.getElementById(id).value = ''; });
 ['terms','privacy'].forEach(function(id){ document.getElementById(id).checked = false; });
}
function closeForm(message) {
 terminal = true; token = ''; form.hidden = true; clearPrivateFields();
 document.getElementById('submit').disabled = true;
 if (message) {
   document.getElementById('outcome-notice').textContent = message;
   document.getElementById('outcome-notice').hidden = false;
 }
}
window.addEventListener('pagehide', function(){
 generation += 1; closeForm(); if (controller) controller.abort();
});
window.addEventListener('pageshow', function(event){
 if (!event.persisted) return;
 generation += 1; closeForm('Esta página se cerró. Si habías enviado la solicitud, confirmá su estado con Che Vení antes de repetirla.');
 document.getElementById('completed').hidden = true;
 document.getElementById('form-status').textContent = 'Esta página se cerró. Si habías enviado la solicitud, confirmá su estado con Che Vení antes de repetirla.';
});
if (!/^[A-Za-z0-9_-]{43}$/.test(token)) { noInvite.hidden = false; return; }
// Separate owner/legal publication approval is required before showing or
// accepting ANY personal data. No policy is approved/published as of this build.
var CONCIERGE_SIGNUP_LEGAL_PUBLICATION_APPROVED = ${legalPublication.approved};
if (!CONCIERGE_SIGNUP_LEGAL_PUBLICATION_APPROVED) {
 document.getElementById('legal-pending').hidden = false;
 token = '';
 return;
}
// Local tab continuity only, never server or cross-device idempotency. Store no
// capability or identity. An unknown result must not reopen through the link.
try {
 var reviewState = sessionStorage.getItem(REVIEW_KEY);
 if (reviewState !== null) {
   closeForm(reviewState === 'submitted' ? '' : 'Hay una solicitud pendiente de conciliación. No repitas la solicitud hasta revisar su estado con Che Vení.');
   if (reviewState === 'submitted') document.getElementById('completed').hidden = false;
   return;
 }
} catch (_) {
 closeForm('No pudimos comprobar si hay una solicitud pendiente. No ingreses datos ni repitas la solicitud hasta revisar su estado con Che Vení.'); return;
}
form.hidden = false;
var status = document.getElementById('form-status');
var send = document.getElementById('submit');
form.addEventListener('submit', async function(event){
 event.preventDefault();
 if (busy || terminal || form.hidden || send.disabled || !token) return;
 status.className = 'status';
 if (!form.reportValidity()) return;
 if (!document.getElementById('terms').checked || !document.getElementById('privacy').checked) {
   status.textContent = 'Tenés que aceptar ambas condiciones para continuar.';
   status.className = 'status error'; return;
 }
 try {
   sessionStorage.setItem(REVIEW_KEY, 'pending');
   if (sessionStorage.getItem(REVIEW_KEY) !== 'pending') throw new Error('INTENT_NOT_SAVED');
 } catch (_) {
   closeForm('No pudimos guardar la operación pendiente. No se envió la solicitud. Revisá su estado con Che Vení antes de continuar.'); return;
 }
 busy = true; send.disabled = true;
 var attempt = generation;
 controller = new AbortController();
 var timeout;
 var deadline = new Promise(function(_, reject){ timeout = setTimeout(function(){ controller.abort(); reject(new Error('REQUEST_DEADLINE')); }, 8000); });
 status.textContent = 'Registrando tu solicitud…';
 try {
   var responsePromise = fetch('${config.apiOrigin}/api/concierge/manager/signup-request', {
     method:'POST', mode:'cors', credentials:'omit', cache:'no-store', redirect:'error', referrerPolicy:'no-referrer', signal:controller.signal,
     headers: {'Content-Type':'application/json'},
     body:JSON.stringify({
       invite:token,managerName:document.getElementById('managerName').value,
       email:document.getElementById('email').value,
       businessName:document.getElementById('businessName').value,
       acceptBeta:true,acceptPrivacy:true
     })
   }).then(async function(resp){ return {resp:resp,data:await resp.json()}; });
   var result = await Promise.race([responsePromise, deadline]);
   var resp = result.resp, data = result.data;
   if (attempt !== generation || terminal) return;
   if (data && data.reconciliation_required === true) throw new Error('RECONCILIATION_REQUIRED');
   if (resp.status === 202 && data && data.ok === true && data.code === 'PENDING_OWNER_APPROVAL') {
     try { sessionStorage.setItem(REVIEW_KEY, 'submitted'); } catch (_) {}
     closeForm();
     document.getElementById('completed').hidden = false;
     return;
   }
   if (resp.status === 400 && data && data.ok === false && data.code === 'INVALID_REQUEST') {
     if (!clearIntent()) throw new Error('INTENT_NOT_CLEARED');
     status.textContent = 'Revisá los datos y las condiciones antes de volver a enviar la solicitud.';
   } else if (resp.status === 503 && data && data.ok === false &&
       ['MANAGER_BETA_SIGNUP_CLOSED','MANAGER_BETA_VERIFIED_LEGAL_ADMISSION_NOT_CONNECTED','MANAGER_BETA_SIGNUP_UNCONFIGURED'].includes(data.code)) {
     if (!clearIntent()) throw new Error('INTENT_NOT_CLEARED');
     closeForm('La inscripción todavía no está habilitada. Consultá a Che Vení antes de continuar.');
   } else if (resp.status === 400 && data && data.ok === false && data.code === 'INVITATION_INVALID_OR_EXPIRED') {
     if (!clearIntent()) throw new Error('INTENT_NOT_CLEARED');
     closeForm('La invitación venció o ya se utilizó. Confirmá su estado con Che Vení.');
   } else {
     closeForm('No pudimos confirmar el resultado. No repitas la solicitud hasta revisar su estado con Che Vení.');
   }
   status.className = 'status error';
 } catch (_) {
   if (attempt !== generation || terminal) return;
   closeForm('No pudimos confirmar el resultado. No repitas la solicitud hasta revisar su estado con Che Vení.');
   status.className = 'status error';
 } finally { clearTimeout(timeout); controller = null; if (attempt === generation && !terminal) { busy = false; send.disabled = false; } }
});
})();
</script></body></html>`;
fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log('Private Beta manager registration page prepared (no invitation issued). Legal publication gate: '+legalPublication.reason);
