// Compose the latest retained property/journey views with the fixed ORIGINAL
// manager consumers. Emit only changed assets: no duplicate application.
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {build as previous} from '../property-bootstrap-20261112-v1/materialize.mjs';
import composer from './compose.cjs';
const here=path.dirname(fileURLToPath(import.meta.url));
const assets=['manager-auth.js','manager-requests.js','manager-incidents.js','manager-knowledge.js','manager-invite.js'];
const reviewNotice='<p class="qa-review-notice" role="status">Demostración QA · sin envíos, cuentas ni reservas reales. No ingreses datos personales.</p>';
const beta='<p>Beta prevista para un manager fundador y una propiedad en CABA. Reconocimiento Founding Manager sujeto a designación expresa. Treinta días gratuitos desde la primera estadía real verificada; no desde el registro o el borrador. Sin cobro ni conversión automática a pago. Sin fecha de lanzamiento prometida.</p>';
function productPages(g){
 const main=(name,content)=>{const key='manager/'+name+'/index.html',s=g[key];if((s.match(/<main>/g)||[]).length!==1)throw Error('PRODUCT_MAIN_SOURCE_DRIFT');g[key]=s.replace(/<main>[\s\S]*<\/main>/,'<main>'+content+'</main>');};
 const form=(name)=>{const matches=g['manager/'+name+'/index.html'].match(/<form inert[\s\S]*?<\/form>/g);if(matches?.length!==1)throw Error('PRODUCT_FORM_SOURCE_DRIFT');return matches[0];};
 const propertyForm=form('propiedad').replace('id="property"','id="property" aria-describedby="property-review-note"')
  .replace('Captura estructurada retenida; no completar datos reales','Datos que se pedirán en la revisión; no completar esta demostración')
  .replace('Calle (privada)','Calle (obligatoria, privada)').replace('Número (privado)','Número (obligatorio, privado)')
  .replace(/<p>Subset de captura:[\s\S]*?<\/p>/,'<p>Configuración admitida en esta revisión: Primera propiedad · Departamento · Español · entrada 15:00 · salida 10:00. No se asigna un edificio. La ubicación en CABA debe acreditarse por separado.</p>')
  .replace('La configuración diferente no es representable en esta captura; requiere otro contrato retenido.','Otros tipos, nombres, idiomas u horarios todavía no están disponibles; no se descartan campos para aceptarlos.')
  .replace('Crear borrador: no disponible','Crear propiedad: pendiente de habilitación')
  .replace('HELD. No se creó ni envió una propiedad. UNKNOWN requiere conciliación; sin reenvío.','No se creó ninguna propiedad ni se enviaron datos. Si un resultado no puede confirmarse, se revisa sin volver a enviarlo.');
 main('propiedad',`<h1>Tu primera propiedad</h1>${reviewNotice}<ol aria-label="Incorporación de la propiedad"><li>Invitación e identidad: pendientes de acreditación.</li><li>Revisión humana del manager y de la propiedad: pendiente.</li><li>Configuración: pendiente de habilitación.</li></ol><section id="bootstrap-elegibilidad"><h2>Antes de comenzar</h2><p>Necesitás una cuenta vigente y permiso expreso para administrar la primera propiedad. Esta demostración no verifica identidad, designa fundador ni concede permisos.</p></section><section id="primera-propiedad"><h2>Preparar los datos</h2><section id="revision-captura"><h3>Revisar dirección y configuración</h3><p id="property-review-note">Calle y número son obligatorios; piso y unidad, opcionales. Los campos se muestran vacíos y bloqueados. Esta vista no guarda direcciones ni comprueba la jurisdicción.</p>${propertyForm}</section><section id="borrador-retenido"><h3>Propiedad pendiente de creación</h3><p>No se creó ninguna propiedad. Revisar el formato o preparar un borrador no equivale a aprobarlo ni guardarlo.</p></section><section id="lectura-retenida"><h3>Resultado sin confirmar</h3><p>Si se pierde una respuesta, no vuelvas a crear la propiedad. Primero debe comprobarse qué ocurrió con la solicitud anterior.</p></section><section id="configuracion-retenida"><h3>Configuración pendiente</h3><p>Las funciones de administración necesitan revisión y autorización vigentes. No hay códigos ni datos privados disponibles en esta vista.</p><a href="/manager/planificar-estadia/">Revisar la planificación de una estadía</a></section></section>${beta}`);
 const stayForm=form('planificar-estadia').replace('Interfaz retenida; sin captura ni envío','Planificación en revisión; sin captura ni envío')
  .replace(/<p>Estado previsto:[\s\S]*?<\/p>/,'<p>La planificación todavía no está habilitada. El huésped deberá quedar vinculado a su estadía por una invitación y verificación autorizadas. Aquí no se registra ni se invita a nadie.</p>')
  .replace('Falta contrato protegido. No se realizó ninguna operación.','Planificación pendiente de habilitación. No se guardó ni se envió una estadía.');
 main('planificar-estadia',`<h1>Preparar una estadía</h1>${reviewNotice}<p>Las fechas se presentan en horario de CABA. Una ventana prevista no concede acceso por sí sola; el servicio debe validar la cuenta, la reserva y la identidad actual.</p>${stayForm}<section id="checkout"><h2>Cambios, cancelación y checkout</h2><p>Estas acciones todavía no están habilitadas en el candidato. Cambiar fechas requiere una nueva revisión; no prolonga automáticamente el acceso.</p><p>Después del checkout no debe quedar acceso privado. Cada reserva consecutiva necesita su propia invitación y verificación.</p><p>Si no se conoce el resultado de una acción, se conserva pendiente de comprobación. No vuelvas a enviarla.</p><button type="button" disabled>Checkout pendiente de habilitación</button></section>${beta}`);
 main('prearrival',`<h1>La experiencia de tu huésped</h1>${reviewNotice}<p>Este recorrido explica los estados previstos. No es un portal habilitado ni una invitación real.</p><section><h2>Invitación y verificación</h2><p>El huésped recibirá un enlace autorizado y deberá verificar su identidad. El enlace por sí solo no concede acceso privado.</p></section><section><h2>Antes de llegar</h2><p>Únicamente información pública y no sensible. No se muestran datos de la propiedad, códigos ni instrucciones privadas antes del check-in autorizado.</p></section><section><h2>Check-in pendiente</h2><p>La hora de llegada no reemplaza la autorización de check-in. Si no se puede comprobar el acceso, la información privada permanece cerrada.</p></section><section><h2>Durante la estadía</h2><p>Las consultas, solicitudes y asistencia requieren acceso vigente a esa reserva. Una solicitud pendiente o una respuesta perdida no se muestra como resuelta.</p></section><section><h2>Después del checkout</h2><p>Finaliza el acceso privado de esa estadía. Una próxima reserva no hereda su sesión ni sus permisos.</p></section><section id="guia-publica"><h2>Che Vení Free</h2><p>La guía turística pública continúa por separado después del checkout y para otras ciudades. No recupera permisos privados. No se cargó un catálogo o contenido de propiedad en esta demostración.</p></section>`);
 main('recorrido',`<h1>Tu recorrido en Che Vení</h1>${reviewNotice}<p>Estado de incorporación: pendiente de revisión. La demostración no representa una sesión verificada.</p><ol><li><a href="/manager/activar/">Invitación y verificación de identidad</a> — acceso pendiente.</li><li><a href="/manager/">Panel del manager</a> — vista de revisión.</li><li><a href="/manager/propiedad/">Primera propiedad</a> — datos y configuración pendientes.</li><li><a href="/manager/planificar-estadia/">Estadías</a> — planificación sin envíos.</li><li><a href="/manager/prearrival/">Experiencia del huésped</a> — llegada, estadía y salida.</li><li><a href="/manager/#solicitudes">Solicitudes</a> y <a href="/manager/#incidencias">asistencia</a> — acciones sujetas a permiso y confirmación.</li></ol><h2>Si no podés continuar</h2><p>Invitación no válida: solicitá que se revise el enlace. Identidad pendiente: completá el mecanismo autorizado cuando esté disponible. Acceso rechazado: verificá los permisos. Información sin confirmar: no repitas una operación pendiente.</p>${beta}`);
 const css=`\n/* QA product accessibility/presentation; never grants access. */
 :focus-visible{outline:3px solid #0b5148;outline-offset:3px}
 a,button,input,select{min-height:44px}a{overflow-wrap:anywhere}button,input,select,textarea{font:inherit;font-size:16px;max-width:100%;box-sizing:border-box}
 p,li,td,th,.row,.card,.tag{overflow-wrap:anywhere;min-width:0}table{display:block;max-width:100%;overflow-x:auto}p,li{line-height:1.6}
 nav a,.subnav a{display:inline-flex;align-items:center;padding:10px 12px}nav{display:flex;flex-wrap:wrap;gap:4px}
 :disabled{opacity:1;color:#465650;background:#edf1ef;cursor:not-allowed}.qa-review-notice{padding:12px;border:1px solid #b9a36c;background:#fff6dc;border-radius:10px}
 .qa-skip-link{position:absolute;left:12px;top:-100px;background:#fff;padding:12px;z-index:20}.qa-skip-link:focus{top:12px}.manager-auth-pending .qa-skip-link{display:none}
 @media(max-width:720px){.top{height:auto;min-height:70px;flex-wrap:wrap;gap:8px;padding-block:12px}.section-head{align-items:flex-start;flex-wrap:wrap}.manager-auth-screen{padding:16px}.manager-auth-card{padding:20px}fieldset{min-width:0}body{max-width:100%}}
 `;
 // One shared stylesheet, reused by the retained planning pages too.
 g['manager/manager.css']+=css;
 for(const file of Object.keys(g).filter(p=>p.endsWith('.html')&&g[p].includes('href="/manager/qa-planning.css"'))){
  g[file]=g[file].replace('<link rel="stylesheet" href="/manager/qa-planning.css">','<link rel="stylesheet" href="/manager/manager.css"><link rel="stylesheet" href="/manager/qa-planning.css">');
 }
 g['manager/qa-planning.js']=g['manager/qa-planning.js'].replace('Operación retenida. No se enviaron datos. Si una operación anterior quedó UNKNOWN, requiere conciliación independiente; no reintentes.','Acción no disponible. No se enviaron datos. Si un resultado anterior sigue sin confirmar, debe revisarse antes de continuar; no vuelvas a enviarlo.');
 let index=g['manager/index.html'];
 index=index.replace('<div class="subnav mobile-nav">','<div class="subnav mobile-nav" role="navigation" aria-label="Secciones del panel en teléfonos">').replace('<a href="#solicitudes">Solicitudes</a>\n          </div>','<a href="#solicitudes">Solicitudes</a><a href="#knowledge">Conocimiento</a><a href="#soporte">Soporte y cuenta</a>\n          </div>');
 index=index.replace(/(<body[^>]*>)/,'$1<a class="qa-skip-link" href="#inicio">Ir al contenido</a>');
 index=index.replaceAll('Consultando Che Vení Concierge Dev.','Consultando la vista de revisión.').replaceAll('role="status" aria-live="polite"','role="status" aria-live="polite" aria-atomic="true"');
 index=index.replace('Podés cargar estadías, responder incidencias y aprobar solicitudes hablando naturalmente con Che Vení.','Las operaciones por WhatsApp necesitan autorización y confirmación. Esta demostración no envía mensajes.').replace('Hasta 24 h','Revisión pendiente');
 index=index.replace('Preview aislada. La contraseña se envía directamente a Supabase Auth y no se guarda en el sitio.','Demostración QA: el formulario está bloqueado y no envía credenciales. No ingreses datos personales.')
  .replace('Preview autenticada. Datos reales de Che Vení Concierge Dev para las propiedades autorizadas.','Demostración del panel. Sin datos privados de huéspedes ni conexión a servicios reales.')
  .replace('>Sesión verificada</span>','>Acceso pendiente de verificación</span>')
  .replace('acceso, Propiedades, Estadías, Conocimiento, Solicitudes e Incidencias usan datos reales de Che Vení Concierge Dev.','Esta revisión muestra estados y componentes del producto sin una sesión, datos u operaciones reales.')
  .replaceAll('Preview autenticada','Demostración QA')
  .replace(/<p class="footer-note">[\s\S]*?<\/p>/,'<p class="footer-note">Che Vení Concierge · revisión QA · sin cuentas, datos o activaciones reales.</p>');
 g['manager/index.html']=index;
 for(const file of Object.keys(g).filter(p=>p.endsWith('.html')))g[file]=g[file].replace('QA offline retenida. No ingreses datos reales. Sin servicios. Beta V1 NO-GO.','Demostración QA · sin envíos ni operaciones reales. No ingreses datos personales.');
}
export function build({productBaseline=false}={}){const r=previous(),fixed=composer.build({productBaseline});for(const asset of assets)r.generated['manager/'+asset]=fixed.generated['manager/'+asset];if(!productBaseline)productPages(r.generated);return r;}
export function materialize({reviewDir=null}={}){
 const merged=build().generated,base=previous().generated,files=[];
 for(const name of Object.keys(merged)){if(merged[name]===base[name])continue;const content=merged[name],file=path.join(here,'overlays',name);if(!/^manager\/[a-z0-9/.-]+$/.test(name)||name.includes('..'))throw Error('QA_PATH_HELD');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);files.push({path:'overlays/'+name,bytes:Buffer.byteLength(content),sha256:createHash('sha256').update(content).digest('hex'),baseSha256:createHash('sha256').update(base[name]).digest('hex')});}
 const reviewFiles=[];
 if(reviewDir){
  for(const [name,source] of Object.entries(merged)){
   const content=name.endsWith('.html')?source.replace(/(href|src)="(\/manager\/[^"\s]*)"/g,(_,attribute,url)=>{
    let [target,fragment]=url.slice(1).split('#');if(target.endsWith('/'))target+='index.html';
    if(!Object.hasOwn(merged,target))throw Error('QA_REVIEW_TARGET_MISSING');
    const relative=path.posix.relative(path.posix.dirname(name),target)||path.posix.basename(target);
    return attribute+'="'+relative+(fragment?'#'+fragment:'')+'"';
   }):source;
   const file=path.join(reviewDir,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);
   reviewFiles.push({path:name,sha256:createHash('sha256').update(content).digest('hex')});
  }
 }
 const manifest={classification:'RETAINED_QA_OVERLAY_NOT_OPERATIONAL_BUILD',basePackage:'qa/property-bootstrap-20261112-v1/materialize.mjs',webSource:'791c0b509b7557d1f44e8011a3900ceb51f13c53',backendSource:'a86fe1cff70121838795a40139b5762c6b308b37',productReview:'20261124',files,reviewFiles,mergedFiles:Object.keys(merged).length,networkAllowed:false,formsInert:true,actualAuthVerified:false,browserExecuted:false,sqlExecuted:false,dispatchPerformed:false,betaDecision:'NO-GO'};
 fs.writeFileSync(path.join(here,'OVERLAY-MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');return manifest;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length>1||args.length===1&&args[0]!=='--review')throw Error('QA_REVIEW_USAGE');
 const m=materialize({reviewDir:args[0]?path.join(here,'review'):null});console.log(JSON.stringify({overlayFiles:m.files.length,reviewFiles:m.reviewFiles.length,reviewEntry:m.reviewFiles.length?'review/manager/recorrido/index.html':null,servicesStarted:0,betaDecision:'NO-GO'}));
}
