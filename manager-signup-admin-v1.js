// Isolated operator console for invite-only Concierge Beta onboarding.
// Built as a static Preview page, not linked from public navigation.
// Access, tenant owner and operator allowlist are ALWAYS enforced by Backend.
const fs=require('node:fs');
const path=require('node:path');
const target=path.join(__dirname,'dist','manager','altas');
fs.mkdirSync(target,{recursive:true});
const html=String.raw`<!doctype html><html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Cache-Control" content="no-store">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; object-src 'none'; img-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src https://chebot-backend-git-concierge-v3-design-chebot.vercel.app; form-action 'none'">
<title>Altas privadas · Chebot Concierge Beta</title>
<style>
:root{font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#f7f4ec;color:#16302d}
*{box-sizing:border-box}body{margin:0;padding:26px 16px;min-height:100vh}
main{max-width:780px;margin:0 auto}.panel{background:#fff;border:1px solid #e5ddd0;border-radius:16px;padding:clamp(18px,4vw,28px);margin-bottom:18px;box-shadow:0 10px 30px #16302d0b}
small{color:#0f766e;letter-spacing:.1em;text-transform:uppercase;font-weight:800}
h1{font-size:clamp(1.65rem,4vw,2.15rem)}h2{font-size:1.23rem;margin-top:0}
p{line-height:1.6;color:#50615d}
label{display:block;font-weight:750;margin:12px 0 7px}
input{width:100%;font:inherit;padding:12px;border:1px solid #9cacaa;border-radius:9px}
button{background:#0f766e;color:#fff;border:0;border-radius:9px;padding:12px 17px;font:inherit;font-weight:750;cursor:pointer}
button.secondary{background:#e8f3ef;color:#0e625c;border:1px solid #b6d8d1}
button.danger{background:#fff2f0;color:#a52624;border:1px solid #e3b6b2}
button:disabled{opacity:.55;cursor:not-allowed}
button:focus-visible,input:focus-visible,a:focus-visible{outline:3px solid #0f766e;outline-offset:2px}
a{color:#0f766e}.actions{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.notice{padding:12px 15px;border-radius:9px;background:#edf5f2;color:#16302d;font-weight:650;margin:12px 0}
.error{background:#fff0ee;color:#992322}.card{border:1px solid #e7e2d7;border-radius:12px;padding:16px;margin:13px 0;overflow-wrap:anywhere}
.badge{color:#0f766e;font-weight:750;font-size:.85rem}.muted{font-size:.88rem;color:#667670}
#prepared-link{word-break:break-all;display:block;margin:12px 0;font-family:ui-monospace,monospace;font-size:.88rem}
[hidden]{display:none!important}
</style></head><body><main>
<section class="panel">
 <small>Chebot Concierge Beta V1 · uso interno</small>
 <h1>Invitaciones de managers</h1>
 <p>Solo el operador autorizado puede preparar invitaciones. La emisión no contacta a nadie ni da de alta cuentas. El registro y el cron permanecen cerrados hasta autorización independiente.</p>
 <div id="access-status" class="notice" role="status" aria-live="polite">Comprobando sesión de operador…</div>
 <div class="actions"><a href="/manager/">Volver al panel</a><button type="button" id="refresh" class="secondary" hidden>Actualizar solicitudes</button></div>
</section>
<section class="panel" id="editor" hidden>
 <h2>Preparar invitación individual</h2>
 <p class="muted">Usá únicamente el correo del candidato que aceptó ser contactado. La invitación dura 48 horas y se puede usar una sola vez. No envía mensajes de forma automática.</p>
 <form id="issue-form">
  <label for="invite-email">Correo del manager invitado</label>
  <input type="email" id="invite-email" required autocomplete="off" maxlength="254" placeholder="correo del candidato">
  <label class="muted"><input type="checkbox" id="issue-confirm" required style="width:auto;margin-right:8px">Confirmo que el titular de Chebot autorizó preparar esta invitación individual.</label>
  <button id="issue-button" type="submit">Preparar enlace privado</button>
 </form>
 <div id="issue-status" role="status" aria-live="polite"></div>
 <div id="result" class="notice" hidden>
  <strong>Enlace preparado, NO enviado.</strong>
  <p>Copialo y conserválo en un canal privado. No se puede recuperar después de abandonar esta página. No lo publiques en GitHub.</p>
  <code id="prepared-link"></code>
  <button id="copy-link" type="button" class="secondary">Copiar enlace</button>
 </div>
</section>
<section class="panel" id="review" hidden>
 <h2>Estado de las solicitudes</h2>
 <p class="muted">«Solicitud recibida» significa pendiente de revisión. No implica que se haya creado un usuario o que se haya aprobado la operación.</p>
 <div id="applications" aria-live="polite"></div>
</section>
</main>
<script>
(function(){
'use strict';
var TOKEN_KEY='chebot_manager_preview_access_token';
var token=sessionStorage.getItem(TOKEN_KEY)||'';
var API='https://chebot-backend-git-concierge-v3-design-chebot.vercel.app/api/concierge/manager/signup-admin';
var access=document.getElementById('access-status'),issueStatus=document.getElementById('issue-status');
var issueForm=document.getElementById('issue-form'),issueButton=document.getElementById('issue-button');
var result=document.getElementById('result'),preparedLink=document.getElementById('prepared-link');
var editor=document.getElementById('editor'),review=document.getElementById('review');
var refresh=document.getElementById('refresh');
function message(el,text,error){
 el.textContent=text;
 el.className=error?'notice error':'notice';
}
function makeText(tag,value,cls){
 var item=document.createElement(tag);item.textContent=String(value||'');
 if(cls)item.className=cls;return item;
}
async function api(method,body){
 var options={method:method,mode:'cors',credentials:'omit',cache:'no-store',
   headers:{Authorization:'Bearer '+token}};
 if(body){options.headers['Content-Type']='application/json';options.body=JSON.stringify(body)}
 var resp=await fetch(API,options);
 var data={};
 try{data=await resp.json()}catch(_){}
 return {code:resp.status,data:data};
}
function dateText(value){if(!value)return '—';var d=new Date(value);return isNaN(d.valueOf())?'—':d.toLocaleString('es-AR')}
async function update(){
 if(!token){message(access,'Ingresá primero al Panel de Manager y después volvé a esta página.',true);return}
 try{
   var result=await api('GET');
   if(result.code===503){message(access,'Las invitaciones siguen cerradas por seguridad. Se requiere autorización técnica y operativa para habilitarlas.',true);return}
   if(result.code===403||result.code===401){message(access,'Esta sesión no tiene permiso de operador o venció. Ingresá de nuevo con la cuenta autorizada.',true);return}
   if(result.code!==200||!result.data.ok){message(access,'No se pudo validar el acceso a altas privadas.',true);return}
   message(access,'Acceso administrativo verificado. Todavía no se activó ninguna cuenta comercial.',false);
   editor.hidden=false;review.hidden=false;refresh.hidden=false;
   var container=document.getElementById('applications');
   container.replaceChildren();
   var list=result.data.applications;
   if(!Array.isArray(list)||!list.length){container.appendChild(makeText('p','No hay invitaciones ni solicitudes de managers.'));return}
   for(var row of list){
     var card=document.createElement('article');card.className='card';
     card.appendChild(makeText('div',row.email_normalized,'badge'));
     var state=row.status==='submitted'?'Solicitud recibida · pendiente de revisión':row.status==='revoked'?'Invitación revocada':Date.parse(row.expires_at)<=Date.now()?'Invitación vencida':'Invitación preparada';
     card.appendChild(makeText('p',state));
     if(row.status==='submitted'){
       card.appendChild(makeText('p','Nombre: '+(row.manager_display_name||'—')));
       card.appendChild(makeText('p','Negocio: '+(row.business_display_name||'—')));
       card.appendChild(makeText('p','Aceptación Beta: '+(row.beta_terms_version||'—')+' · Privacidad: '+(row.privacy_accepted?'Sí':'No')));
       card.appendChild(makeText('p','Recibida: '+dateText(row.submitted_at),'muted'));
     }else if(row.status==='issued'){
       card.appendChild(makeText('p','Vence: '+dateText(row.expires_at),'muted'));
       var revoke=document.createElement('button');
       revoke.type='button';revoke.className='danger';revoke.textContent='Revocar invitación';
       revoke.addEventListener('click',async function(id,el){
         if(!window.confirm('¿Revocar esta invitación? El enlace dejará de ser válido.'))return;
         el.disabled=true;
         try{
           var rv=await api('POST',{action:'revoke',invitationId:id,confirmRevoke:true});
           if(rv.code!==200){window.alert('No se pudo revocar. Volvé a consultar el estado.')}
           await update();
         }catch(_){message(access,'No fue posible confirmar la revocación.',true)}
         finally{el.disabled=false}
       }.bind(null,row.id,revoke));
       card.appendChild(revoke);
     }
     container.appendChild(card);
   }
 }catch(_){message(access,'No se pudo conectar al servicio de altas privadas. Revisá la conexión.',true)}
}
issueForm.addEventListener('submit',async function(e){
 e.preventDefault();
 if(!issueForm.reportValidity())return;
 issueButton.disabled=true;result.hidden=true;preparedLink.textContent='';
 message(issueStatus,'Preparando invitación privada…',false);
 try{
   var r=await api('POST',{action:'issue',email:document.getElementById('invite-email').value,
       confirmIssue:document.getElementById('issue-confirm').checked});
   if(r.code===201&&r.data.code==='INVITATION_PREPARED_NOT_SENT'){
     preparedLink.textContent=r.data.url;
     result.hidden=false;
     message(issueStatus,'Invitación preparada. No se envió ningún mensaje.',false);
     issueForm.reset();
     await update();
   }else if(r.code===409)message(issueStatus,'Ese correo ya tiene una invitación pendiente. Revisá la lista antes de preparar otra.',true);
   else if(r.code===503)message(issueStatus,'Altas cerradas: se requiere autorización explícita.',true);
   else message(issueStatus,'No se pudo preparar la invitación.',true);
 }catch(_){message(issueStatus,'No se pudo contactar al Backend Preview.',true)}
 finally{issueButton.disabled=false}
});
document.getElementById('copy-link').addEventListener('click',async function(){
 var link=preparedLink.textContent;
 if(!link)return;
 try{await navigator.clipboard.writeText(link);message(issueStatus,'Enlace copiado. No enviado.',false)}
 catch(_){message(issueStatus,'Copiá manualmente el enlace desde esta pantalla privada.',true)}
});
refresh.addEventListener('click',update);
update();
})();
</script></body></html>`;
fs.writeFileSync(path.join(target,'index.html'),html);
console.log('Manager invite operator console generated (access denied by default).');
