const fs = require('fs');
const path = require('path');

module.exports = function buildManagerV1({ out }) {
  const managerDir = path.join(out, 'manager');
  fs.mkdirSync(managerDir, { recursive: true });

  const css = `:root{--cream:#fffbf0;--ink:#16302d;--teal:#0f766e;--teal2:#115e59;--white:#fff;--muted:#61706d;--line:#e5ddd0;--soft:#eaf4f2;--warn:#fff6dc;--danger:#fff0ed}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:90px}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif;background:#f7f4ec;color:var(--ink)}a{color:inherit;text-decoration:none}.shell{min-height:100vh;display:grid;grid-template-columns:250px 1fr}.side{background:#123431;color:#fff;padding:24px 18px;position:sticky;top:0;height:100vh}.brand{font-size:1.35rem;font-weight:900;margin-bottom:6px}.brand span{color:#74d3c8}.beta{font-size:.78rem;color:#b8d9d4;margin-bottom:24px}.nav{display:grid;gap:7px}.nav a{padding:11px 12px;border-radius:10px;color:#e8f2ef}.nav a:hover,.nav a.active{background:#1f4b46}.side-note{position:absolute;left:18px;right:18px;bottom:22px;font-size:.78rem;color:#b8d9d4;line-height:1.45}.main{min-width:0}.top{height:70px;background:var(--cream);border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 28px;position:sticky;top:0;z-index:5}.top strong{font-size:1rem}.pill{display:inline-flex;align-items:center;gap:7px;border:1px solid #cfd8d5;background:#fff;border-radius:999px;padding:8px 11px;font-size:.85rem}.content{max-width:1240px;margin:0 auto;padding:30px}.eyebrow{color:var(--teal);font-size:.78rem;text-transform:uppercase;letter-spacing:.12em;font-weight:900}.hero h1{margin:5px 0 7px;font-size:clamp(2rem,4vw,3rem)}.hero p{margin:0;color:var(--muted);max-width:760px}.notice{margin:20px 0;background:var(--warn);border:1px solid #ead9a0;border-radius:14px;padding:14px 16px;font-size:.9rem}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}.metric,.card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px;box-shadow:0 5px 20px #173d3808}.metric small,.muted{color:var(--muted)}.metric b{display:block;font-size:2rem;margin-top:4px}.section{margin-top:30px}.section-head{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:13px}.section h2{margin:0;font-size:1.35rem}.section-head a{color:var(--teal);font-weight:800;font-size:.9rem}.list{display:grid;gap:10px}.row{background:#fff;border:1px solid var(--line);border-radius:14px;padding:15px 16px;display:grid;grid-template-columns:1.4fr 1fr 1fr auto;gap:14px;align-items:center}.row b{font-size:.96rem}.tag{display:inline-flex;width:max-content;max-width:100%;padding:6px 9px;border-radius:999px;background:var(--soft);color:var(--teal2);font-weight:850;font-size:.78rem}.tag.warn{background:var(--warn);color:#7a5b00}.tag.danger{background:var(--danger);color:#8a3325}.split{display:grid;grid-template-columns:1.15fr .85fr;gap:16px}.quick{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.quick .card b{margin-bottom:6px}.subnav{display:flex;flex-wrap:wrap;gap:8px;margin-top:22px}.subnav a{background:#fff;border:1px solid var(--line);padding:8px 11px;border-radius:999px;font-size:.84rem}.demo-lock{display:inline-flex;align-items:center;gap:7px;color:#7a5b00;font-size:.82rem}.footer-note{margin:34px 0 10px;color:var(--muted);font-size:.8rem}.secret{letter-spacing:.18em;font-weight:900}.mobile-nav{display:none}@media(max-width:980px){.grid{grid-template-columns:repeat(2,1fr)}.split{grid-template-columns:1fr}.row{grid-template-columns:1fr 1fr}.shell{grid-template-columns:210px 1fr}}@media(max-width:720px){.shell{display:block}.side{display:none}.top{padding:0 16px}.mobile-nav{display:block}.content{padding:22px 16px}.grid{grid-template-columns:1fr 1fr}.row{grid-template-columns:1fr}.quick{grid-template-columns:1fr}.top .pill{display:none}}@media(max-width:430px){.grid{grid-template-columns:1fr}}`;
  fs.writeFileSync(path.join(managerDir, 'manager.css'), css);

  const html = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <meta name="theme-color" content="#0f766e">
  <title>Chebot Concierge — Manager Web V1</title>
  <meta name="description" content="Preview interna del panel de Chebot Concierge para managers.">
  <link rel="icon" type="image/png" href="/favicon.png">
  <link rel="stylesheet" href="/manager/manager.css">
</head>
<body>
  <div class="shell">
    <aside class="side">
      <div class="brand">Che<span>bot</span> Concierge</div>
      <div class="beta">Manager Web V1 · Beta interna</div>
      <nav class="nav" aria-label="Secciones del panel">
        <a class="active" href="#inicio">Inicio</a>
        <a href="#propiedades">Propiedades</a>
        <a href="#estadias">Estadías</a>
        <a href="#knowledge">Conocimiento</a>
        <a href="#incidencias">Incidencias</a>
        <a href="#solicitudes">Solicitudes</a>
        <a href="#resultados">Resultados</a>
        <a href="#soporte">Soporte y cuenta</a>
      </nav>
      <div class="side-note">Preview con datos ficticios. Sin secretos ni información real de huéspedes.</div>
    </aside>

    <main class="main">
      <header class="top">
        <strong>Vicky & Maty · Demo</strong>
        <span class="pill">Modo manager · WhatsApp-first</span>
      </header>

      <div class="content">
        <section class="hero" id="inicio">
          <span class="eyebrow">Necesita tu atención</span>
          <h1>Todo lo importante, sin leer chats completos.</h1>
          <p>Chebot resuelve lo que ya sabe y te muestra únicamente decisiones, excepciones y señales que requieren intervención.</p>
          <div class="notice"><b>Preview interna:</b> interfaz ficticia y aislada. El acceso real, autenticación y datos vivos se conectarán al backend Concierge en una etapa posterior.</div>
          <div class="grid">
            <article class="metric"><small>Solicitudes pendientes</small><b>2</b><span class="tag warn">Decisión requerida</span></article>
            <article class="metric"><small>Incidencias abiertas</small><b>1</b><span class="tag danger">Seguimiento</span></article>
            <article class="metric"><small>Propiedades activas</small><b>1</b><span class="tag">1 en revisión</span></article>
            <article class="metric"><small>Resoluciones confirmadas</small><b>18</b><span class="tag">Demo Beta</span></article>
          </div>
          <div class="subnav mobile-nav">
            <a href="#propiedades">Propiedades</a><a href="#estadias">Estadías</a><a href="#incidencias">Incidencias</a><a href="#solicitudes">Solicitudes</a>
          </div>
        </section>

        <section class="section" id="solicitudes">
          <div class="section-head"><h2>Solicitudes que requieren decisión</h2><a href="#solicitudes">Ver todas</a></div>
          <div class="list">
            <article class="row"><div><b>Early check-in · Mariela</b><div class="muted">Recoleta 2C · solicita 11:00</div></div><span>Hoy</span><span class="tag warn">Pendiente</span><span>Chebot espera tu decisión</span></article>
            <article class="row"><div><b>Late checkout · Martina</b><div class="muted">Palermo 1B · solicita 13:00</div></div><span>Mañana</span><span class="tag warn">Pendiente</span><span>Revisar próxima estadía</span></article>
          </div>
        </section>

        <section class="section" id="incidencias">
          <div class="section-head"><h2>Incidencias</h2><a href="#incidencias">Ver historial</a></div>
          <div class="list">
            <article class="row"><div><b>Aire acondicionado</b><div class="muted">Recoleta 2C · severidad media</div></div><span>Chebot ya envió protocolo</span><span class="tag warn">Esperando huésped</span><span>Manager informado</span></article>
          </div>
        </section>

        <section class="section split">
          <div id="propiedades">
            <div class="section-head"><h2>Propiedades</h2><a href="#propiedades">Administrar</a></div>
            <div class="list">
              <article class="row"><div><b>Recoleta 2C</b><div class="muted">Buenos Aires</div></div><span class="tag">Activa</span><span>1 estadía vigente</span><span>Knowledge OK</span></article>
              <article class="row"><div><b>Palermo 1B</b><div class="muted">Buenos Aires</div></div><span class="tag warn">Lista para revisión</span><span>0 estadías vigentes</span><span>Falta contingencia</span></article>
            </div>
          </div>
          <div id="knowledge">
            <div class="section-head"><h2>Conocimiento</h2><a href="#knowledge">Versiones</a></div>
            <div class="quick">
              <article class="card"><b>Wi-Fi</b><span class="muted">Credencial protegida</span><div class="secret">••••••••</div><span class="demo-lock">🔒 Valor oculto por defecto</span></article>
              <article class="card"><b>Checkout</b><span class="muted">Versión activa</span><p>Salida estándar 11:00. Cambios futuros requieren regla o aprobación.</p></article>
              <article class="card"><b>Reglas del edificio</b><span class="muted">Building scope</span><p>Silencio desde las 23:00.</p></article>
              <article class="card"><b>Revisión pendiente</b><span class="muted">Safety review</span><p>1 instrucción pausada hasta segunda aprobación.</p></article>
            </div>
          </div>
        </section>

        <section class="section" id="estadias">
          <div class="section-head"><h2>Estadías</h2><a href="#estadias">Ver calendario</a></div>
          <div class="list">
            <article class="row"><div><b>Mariela · Recoleta 2C</b><div class="muted">Huésped principal</div></div><span>03–06 oct</span><span class="tag">Activa</span><span>Acceso según ventana</span></article>
            <article class="row"><div><b>Martina · Palermo 1B</b><div class="muted">Próxima estadía</div></div><span>06–09 oct</span><span class="tag">Programada</span><span>Invitación preparada</span></article>
          </div>
        </section>

        <section class="section" id="resultados">
          <div class="section-head"><h2>Resultados Beta</h2><a href="#resultados">Detalle</a></div>
          <div class="grid">
            <article class="metric"><small>Preguntas de propiedad</small><b>24</b><span class="muted">Datos de demostración</span></article>
            <article class="metric"><small>Resolución automática confirmada</small><b>18</b><span class="muted">No cuenta saludos</span></article>
            <article class="metric"><small>Mediadas por manager</small><b>4</b><span class="muted">Confirmadas</span></article>
            <article class="metric"><small>Intervención Sistemas</small><b>20 min</b><span class="muted">Costo humano visible</span></article>
          </div>
        </section>

        <section class="section" id="soporte">
          <div class="section-head"><h2>Soporte y cuenta</h2></div>
          <div class="split">
            <article class="card"><b>Modo manager por WhatsApp</b><p>Podés cargar estadías, responder incidencias y aprobar solicitudes hablando naturalmente con Chebot.</p><span class="tag">Canal principal</span></article>
            <article class="card"><b>Soporte Chebot</b><p>Durante la Beta, los casos que requieren revisión de Sistemas quedan registrados para medir el costo operativo real.</p><span class="tag">Hasta 24 h</span></article>
          </div>
        </section>

        <p class="footer-note">Chebot Concierge Manager Web V1 · Preview interna · Datos ficticios · Sin secretos reales.</p>
      </div>
    </main>
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(managerDir, 'index.html'), html);
};
