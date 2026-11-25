'use strict';
// QA patches on the recovered generator chain. No operational build hooks.
const prior=require('../functional-night-20261112-v1/compose.cjs');
function replace(s,a,b){if(s.split(a).length!==2)throw Error('PILOT_SOURCE_DRIFT: '+a.slice(0,70));return s.replace(a,b);}
function patchAuth(s){
 s=replace(s,'  let authGeneration = 0;','  let authGeneration = 0;\n  let panelContext = null;');
 s=replace(s,'  function clearPanelData() {','  function clearPanelData() {\n    panelContext = null;');
 s=replace(s,'  function showPanel(session) {',`  // View consistency predicate only; never a server authority producer.
  window.cheveniManagerPanelContextMatches = received => Boolean(panelContext && received && typeof received === 'object' && !Array.isArray(received) &&
    Object.keys(received).sort().join('|') === 'account_id|member_id|role' &&
    ['account_id','member_id','role'].every(k => received[k] === panelContext[k]));
  function requirePanelContext(body) {
    if (!window.cheveniManagerPanelContextMatches(body && body.session)) {
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
  "window.addEventListener('cheveni-manager-session-denied', event => {\n    showLogin(event.detail?.reason === 'VIEW_CONTEXT_CHANGED' ? 'El contexto del panel cambió o no pudo comprobarse. Validá el acceso antes de continuar.' : event.detail?.status === 403 ? 'El acceso fue rechazado. Verificá los permisos vigentes de esta sección.' : 'La sesión dejó de estar autorizada. Iniciá sesión nuevamente.');");
 return s;
}
function patchReadContext(s,kind){
 const title=kind[0].toUpperCase()+kind.slice(1);
 s=replace(s,`  async function loadManager${title}(accessToken) {`,`  async function loadManager${title}(accessToken) {\n    const responseSequence = loadSequence;`);
 const guard=body=>`    {
    if (responseSequence !== loadSequence || readSectionToken() !== accessToken || document.body.classList.contains('manager-auth-pending')) return [];
    const meta = ${body}.meta;
    const context = meta && {account_id:meta.account_id,member_id:meta.member_id,role:meta.member_role};
    if (typeof window.cheveniManagerPanelContextMatches !== 'function' || !window.cheveniManagerPanelContextMatches(context)) {
      window.dispatchEvent(new CustomEvent('cheveni-manager-session-denied', {detail:{reason:'VIEW_CONTEXT_CHANGED'}}));
      throw new Error('MANAGER_VIEW_CONTEXT_CHANGED');
    }
    }`;
 if(kind==='incidents'){
  s=replace(s,'    const incidents = body.incidents;',guard('body')+'\n    const incidents = body.incidents;');
  s=replace(s,'          incidents.forEach((incident) => {',guard('knowledgeBody')+'\n          incidents.forEach((incident) => {');
  return replace(s,'    return incidents;',guard('body')+'\n    return incidents;');
 }
 return replace(s,`    return body.${kind};`,guard('body')+`\n    return body.${kind};`);
}
function patchSection(s){
 // Only the response-header notification carries an HTTP status. The storage
 // failure notification remains unclassified, never a fabricated HTTP result.
 return replace(s,"window.dispatchEvent(new Event('cheveni-manager-session-denied'));\n        }",
  "window.dispatchEvent(new CustomEvent('cheveni-manager-session-denied', {detail:{status:response.status}}));\n        }");
}
function patchKnowledgeDeadline(s){
 const start=s.indexOf('  async function fetchManager(url, options) {'),end=s.indexOf('\n  }',start)+4;
 if(start<0||end<4)throw Error('KNOWLEDGE_FETCH_SOURCE_DRIFT');
 const old=s.slice(start,end);
 return replace(s,old,`  async function fetchManager(url, options) {
    const sequence = loadSequence;
    const accessToken = options.headers && String(options.headers.Authorization || '').replace(/^Bearer /, '');
    const controller = new AbortController(), external = options.signal;
    let timer, closed = false, cancel;
    const deadline = new Promise((_, reject) => {
      cancel = () => { closed = true; controller.abort(); reject(new Error('MANAGER_KNOWLEDGE_UNCONFIRMED')); };
      timer = setTimeout(cancel, 8000);
    });
    if (external) external.addEventListener('abort', cancel, {once:true});
    try {
      if (external?.aborted) { cancel(); return await deadline; }
      // One deadline through headers AND body, including mutation callers.
      // Cancellation is never evidence of rollback; the intent stays UNKNOWN.
      return await Promise.race([deadline, (async () => {
        const response = await fetch(url, {...options, redirect:'error', signal:controller.signal});
        if (!closed && [401,403].includes(response.status) && sequence === loadSequence && readSectionToken() === accessToken
            && !document.body.classList.contains('manager-auth-pending')) {
          window.dispatchEvent(new CustomEvent('cheveni-manager-session-denied', {detail:{status:response.status}}));
        }
        let body = null;
        try { body = await response.json(); } catch (_) {}
        return {ok:response.ok,status:response.status,json:async()=>body};
      })()]);
    } finally {
      closed = true; clearTimeout(timer);
      if (external) external.removeEventListener('abort', cancel);
    }
  }`);
}
function patchProductAuth(s){
 s=replace(s,"sessionLabel.textContent = 'Sesión verificada · ' + role;","sessionLabel.textContent = 'Vista QA · ' + role;");
 s=replace(s,"source.textContent = 'Concierge Dev · dato real';","source.textContent = 'Vista QA · propiedad informada';");
 s=replace(s,"'1 propiedad real' : totalCount + ' propiedades reales'","'1 propiedad en esta vista' : totalCount + ' propiedades en esta vista'");
 s=replace(s,'if (Number.isNaN(date.getTime())) return String(value);',"if (Number.isNaN(date.getTime())) return 'Fecha no disponible';");
 s=replace(s,'  function formatStayDate(value) {',`  // Presentation only. Dates/status NEVER authorize guest access or reveal secrets.
  function stayAccessDescription(stay) {
    const status = effectiveStayStatus(stay);
    const start = Date.parse(String(stay.check_in_at || ''));
    const until = Date.parse(String(stay.access_until || ''));
    if (['cancelled','revoked'].includes(status)) return 'Acceso privado no disponible.';
    if (['completed','expired'].includes(status)) return 'Estadía finalizada · acceso privado no disponible. La guía pública continúa por separado.';
    if (![start,until].every(Number.isFinite)) return 'Ventana de acceso sin confirmar. Revisá las fechas antes de continuar.';
    if (until <= Date.now()) return 'Ventana de acceso finalizada · acceso privado no disponible.';
    if (status === 'draft' || start > Date.now()) return 'Check-in pendiente. No hay acceso privado antes del check-in autorizado.';
    return 'El acceso privado requiere verificación vigente y check-in autorizado.';
  }

  function formatStayDate(value) {`);
 s=replace(s,"        'Acceso: ' + formatStayDate(stay.access_from) + ' → ' + formatStayDate(stay.access_until);",
  "        stayAccessDescription(stay) + ' Ventana prevista: ' + formatStayDate(stay.access_from) + ' → ' + formatStayDate(stay.access_until);");
 return s;
}
function build({baseline=false,productBaseline=false}={}){
 const r=prior.build();if(baseline)return r;
 r.generated['manager/manager-auth.js']=patchAuth(r.generated['manager/manager-auth.js']);
 for(const name of ['requests','incidents'])r.generated['manager/manager-'+name+'.js']=patchSection(r.generated['manager/manager-'+name+'.js']);
 // Knowledge uses the same notification at a different indentation depth.
 r.generated['manager/manager-knowledge.js']=replace(r.generated['manager/manager-knowledge.js'],
  "window.dispatchEvent(new Event('cheveni-manager-session-denied'));\n    }",
  "window.dispatchEvent(new CustomEvent('cheveni-manager-session-denied', {detail:{status:response.status}}));\n    }");
 r.generated['manager/manager-knowledge.js']=patchKnowledgeDeadline(r.generated['manager/manager-knowledge.js']);
 for(const name of ['requests','incidents','knowledge'])r.generated['manager/manager-'+name+'.js']=patchReadContext(r.generated['manager/manager-'+name+'.js'],name);
 r.generated['manager/manager-invite.js']=replace(r.generated['manager/manager-invite.js'],
  "  const readToken = () =>",
  "  // BFCache restore permits only newly rendered controls, never an old binding.\n  window.addEventListener('pageshow', event => { if (event.persisted) { pageActive = true; generation += 1; } });\n  const readToken = () =>");
 if(!productBaseline){
  r.generated['manager/manager-auth.js']=patchProductAuth(r.generated['manager/manager-auth.js']);
  for(const kind of ['requests','incidents']){
   const file='manager/manager-'+kind+'.js';
   r.generated[file]=replace(r.generated[file],
    kind==='requests'?'No hay solicitudes reales para las propiedades autorizadas.':'No hay incidencias reales para las propiedades autorizadas.',
    kind==='requests'?'No hay solicitudes para revisar en esta vista.':'No hay incidencias para revisar en esta vista.');
  }
 }
 return r;
}
module.exports={build,patchAuth,patchSection,patchKnowledgeDeadline,patchReadContext,replace};
