'use strict';
// Extend the existing QA generator chain, never build.js or an operational file.
const previous=require('../property-stay-prearrival-20261112-v1/materialize.cjs');
const replace=(s,a,b)=>{if(s.split(a).length!==2)throw Error('PINNED_AUTH_PATCH_DRIFT');return s.replace(a,b)};
function patchAuth(source){
 const old="generation === authGeneration && accessToken && readToken() === accessToken) {\n          showLogin('La sesión dejó de estar autorizada. Iniciá sesión nuevamente.');";
 const revised="generation === authGeneration && accessToken && readToken() === accessToken) {\n          showLogin(response.status === 403 ? 'El acceso fue rechazado. Verificá los permisos vigentes de esta sección.' : 'La sesión dejó de estar autorizada. Iniciá sesión nuevamente.');";
 source=replace(source,old,revised);
 source=replace(source,'  function clearPanelData() {',"  function clearPanelData() {\n    // Clear prior scope labels at the same time as private rows.\n    sessionLabel.textContent = '';\n    accountLabel.textContent = 'Che Vení Concierge';");
 return source;
}
function build({baseline=false}={}){const r=previous.build();if(!baseline)r.generated['manager/manager-auth.js']=patchAuth(r.generated['manager/manager-auth.js']);return r;}
module.exports={build,patchAuth};
