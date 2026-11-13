'use strict';
// QA patches on the recovered generator chain. No operational build hooks.
const prior=require('../functional-night-20261112-v1/compose.cjs');
function replace(s,a,b){if(s.split(a).length!==2)throw Error('PILOT_SOURCE_DRIFT: '+a.slice(0,70));return s.replace(a,b);}
function patchAuth(s){
 s=replace(s,'  let authGeneration = 0;','  let authGeneration = 0;\n  let panelContext = null;');
 s=replace(s,'  function clearPanelData() {','  function clearPanelData() {\n    panelContext = null;');
 s=replace(s,'  function showPanel(session) {',`  function requirePanelContext(body) {
    const received = body && body.session;
    if (!panelContext || !received || typeof received !== 'object' || Array.isArray(received) ||
        Object.keys(received).sort().join('|') !== 'account_id|member_id|role' ||
        ['account_id','member_id','role'].some(k => received[k] !== panelContext[k])) {
      showLogin('El contexto del panel cambió o no pudo comprobarse. Validá el acceso antes de continuar.');
      throw new Error('MANAGER_VIEW_CONTEXT_CHANGED');
    }
    // UI consistency only. Neither DTO is proof of live server authority.
  }

  function showPanel(session) {
    panelContext = Object.freeze({account_id:session.account_id,member_id:session.member_id,role:session.role});`);
 for(const name of ['Properties','Stays']){
  const field=name.toLowerCase();
  s=replace(s,`    if (generation === authGeneration && readToken() === accessToken && !document.body.classList.contains('manager-auth-pending')) render${name}(body.${field});`,
   `    requirePanelContext(body);\n    if (generation === authGeneration && readToken() === accessToken && !document.body.classList.contains('manager-auth-pending')) render${name}(body.${field});`);
 }
 s=replace(s,"window.addEventListener('cheveni-manager-session-denied', () => {\n    showLogin('La sesión dejó de estar autorizada. Iniciá sesión nuevamente.');",
  "window.addEventListener('cheveni-manager-session-denied', event => {\n    showLogin(event.detail?.status === 403 ? 'El acceso fue rechazado. Verificá los permisos vigentes de esta sección.' : 'La sesión dejó de estar autorizada. Iniciá sesión nuevamente.');");
 return s;
}
function patchSection(s){
 // Only the response-header notification carries an HTTP status. The storage
 // failure notification remains unclassified, never a fabricated HTTP result.
 return replace(s,"window.dispatchEvent(new Event('cheveni-manager-session-denied'));\n        }",
  "window.dispatchEvent(new CustomEvent('cheveni-manager-session-denied', {detail:{status:response.status}}));\n        }");
}
function build({baseline=false}={}){
 const r=prior.build();if(baseline)return r;
 r.generated['manager/manager-auth.js']=patchAuth(r.generated['manager/manager-auth.js']);
 for(const name of ['requests','incidents'])r.generated['manager/manager-'+name+'.js']=patchSection(r.generated['manager/manager-'+name+'.js']);
 // Knowledge uses the same notification at a different indentation depth.
 r.generated['manager/manager-knowledge.js']=replace(r.generated['manager/manager-knowledge.js'],
  "window.dispatchEvent(new Event('cheveni-manager-session-denied'));\n    }",
  "window.dispatchEvent(new CustomEvent('cheveni-manager-session-denied', {detail:{status:response.status}}));\n    }");
 return r;
}
module.exports={build,patchAuth,patchSection,replace};
