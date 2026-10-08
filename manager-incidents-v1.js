const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, 'dist');
const managerDir = path.join(out, 'manager');
const indexFile = path.join(managerDir, 'index.html');
const backendIncidentsUrl =
  'https://chebot-backend-git-concierge-v3-design-chebot.vercel.app/api/concierge/manager/incidents';

if (!fs.existsSync(indexFile)) {
  throw new Error('dist/manager/index.html was not generated before Manager Incidents V1.');
}

const browserJs = `
(() => {
  'use strict';

  const BACKEND_INCIDENTS_URL = ${JSON.stringify(backendIncidentsUrl)};
  const TOKEN_KEY = 'chebot_manager_preview_access_token';
  const list = document.getElementById('manager-incidents-list') || document.querySelector('#incidencias .list');
  const authScreen = document.getElementById('manager-auth');

  if (!list) return;

  const categoryLabels = {
    access: 'Acceso',
    wifi: 'Wi-Fi',
    climate: 'Climatización',
    plumbing: 'Plomería',
    electricity: 'Electricidad',
    appliance: 'Electrodoméstico',
    noise: 'Ruido',
    cleaning: 'Limpieza',
    safety: 'Seguridad',
    health: 'Salud',
    other: 'Otra incidencia'
  };

  const severityLabels = {
    low: 'baja',
    medium: 'media',
    high: 'alta',
    critical: 'crítica'
  };

  const statusLabels = {
    new: 'Nueva',
    resolving: 'Resolviendo',
    waiting_guest: 'Esperando huésped',
    escalated: 'Escalada',
    waiting_manager: 'Esperando manager',
    resolved: 'Resuelta',
    learning_pending: 'Aprendizaje pendiente',
    closed: 'Cerrada'
  };

  function text(value, fallback = '—') {
    const normalized = value === null || value === undefined ? '' : String(value).trim();
    return normalized || fallback;
  }

  function formatDateTime(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return new Intl.DateTimeFormat('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  }

  function statusClass(statusValue, severityValue) {
    const status = String(statusValue || '');
    const severity = String(severityValue || '');
    if (severity === 'critical' || status === 'escalated') return 'tag danger';
    if (status === 'new' || status === 'resolving' || status === 'waiting_guest' || status === 'waiting_manager') {
      return 'tag warn';
    }
    return 'tag';
  }

  function isOpen(item) {
    return item && item.status !== 'resolved' && item.status !== 'closed';
  }

  function renderOpenMetric(items) {
    const metrics = Array.from(document.querySelectorAll('.metric'));
    const card = metrics.find((item) => {
      const small = item.querySelector('small');
      return small && small.textContent.trim() === 'Incidencias abiertas';
    });

    if (!card) return;

    const openCount = items.filter(isOpen).length;
    const number = card.querySelector('b');
    const tag = card.querySelector('.tag');

    if (number) number.textContent = String(openCount);
    if (tag) {
      tag.textContent = openCount === 1 ? '1 requiere seguimiento' : openCount + ' requieren seguimiento';
      tag.className = openCount > 0 ? 'tag danger' : 'tag';
    }
  }

  function renderIncidents(items) {
    list.replaceChildren();
    renderOpenMetric(items);

    if (!items.length) {
      const empty = document.createElement('article');
      empty.className = 'card';
      const title = document.createElement('b');
      title.textContent = 'Sin incidencias';
      const detail = document.createElement('p');
      detail.className = 'muted';
      detail.textContent = 'No hay incidencias reales para las propiedades autorizadas.';
      empty.append(title, detail);
      list.appendChild(empty);
      return;
    }

    items.forEach((item) => {
      const row = document.createElement('article');
      row.className = 'row';

      const identity = document.createElement('div');
      const title = document.createElement('b');
      title.textContent = categoryLabels[item.category] || text(item.category, 'Incidencia');

      const propertyName = item.property && item.property.internal_name
        ? String(item.property.internal_name)
        : 'Propiedad autorizada';
      const detail = document.createElement('div');
      detail.className = 'muted';
      detail.textContent =
        propertyName + ' · severidad ' + (severityLabels[item.severity] || text(item.severity, 'sin informar'));
      identity.append(title, detail);

      const summary = document.createElement('span');
      summary.textContent = text(item.summary, 'Sin resumen');

      const statusTag = document.createElement('span');
      statusTag.className = statusClass(item.status, item.severity);
      statusTag.textContent = statusLabels[item.status] || text(item.status, 'Sin estado');

      const action = document.createElement('span');
      if (item.manager_intervention_required === true) {
        action.textContent = 'Requiere intervención del manager';
      } else if (item.guest_confirmed_resolved === true) {
        action.textContent = 'Resolución confirmada por huésped';
      } else if (item.resolution_summary) {
        action.textContent = text(item.resolution_summary, 'Resolución registrada');
      } else {
        action.textContent = 'Abierta: ' + text(formatDateTime(item.opened_at), '—');
      }

      row.append(identity, summary, statusTag, action);
      list.appendChild(row);
    });
  }

  function renderIncidentsError() {
    list.replaceChildren();

    const errorCard = document.createElement('article');
    errorCard.className = 'card';
    const title = document.createElement('b');
    title.textContent = 'No pudimos cargar las incidencias';
    const detail = document.createElement('p');
    detail.className = 'muted';
    detail.textContent = 'La sesión sigue activa. Reintentá recargando la página.';
    errorCard.append(title, detail);
    list.appendChild(errorCard);
  }

  async function loadManagerIncidents(accessToken) {
    const response = await fetch(BACKEND_INCIDENTS_URL, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        Accept: 'application/json'
      }
    });

    let body = null;
    try { body = await response.json(); } catch (_) {}

    if (!response.ok || !body || body.ok !== true || !Array.isArray(body.incidents)) {
      const error = body && body.error ? String(body.error) : 'MANAGER_INCIDENTS_LOAD_FAILED';
      const e = new Error(error);
      e.code = error;
      throw e;
    }

    return body.incidents;
  }

  let lastLoadedToken = null;
  let loadSequence = 0;

  async function maybeLoadIncidents() {
    const panelVisible = !document.body.classList.contains('manager-auth-pending');
    const accessToken = sessionStorage.getItem(TOKEN_KEY);

    if (!panelVisible || !accessToken) {
      lastLoadedToken = null;
      ++loadSequence;
      return;
    }

    if (accessToken === lastLoadedToken) return;

    const sequence = ++loadSequence;
    lastLoadedToken = accessToken;

    try {
      const items = await loadManagerIncidents(accessToken);
      if (sequence !== loadSequence || sessionStorage.getItem(TOKEN_KEY) !== accessToken || document.body.classList.contains('manager-auth-pending')) return;
      renderIncidents(items);
    } catch (_) {
      if (sequence !== loadSequence || sessionStorage.getItem(TOKEN_KEY) !== accessToken || document.body.classList.contains('manager-auth-pending')) return;
      renderIncidentsError();
    }
  }

  const observer = new MutationObserver(() => {
    maybeLoadIncidents();
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['class']
  });

  if (authScreen) {
    observer.observe(authScreen, {
      attributes: true,
      attributeFilter: ['hidden']
    });
  }

  window.addEventListener('pageshow', maybeLoadIncidents);
  maybeLoadIncidents();
})();
`;

fs.writeFileSync(path.join(managerDir, 'manager-incidents.js'), browserJs);

let html = fs.readFileSync(indexFile, 'utf8');

function replaceRequired(before, after, label) {
  if (!html.includes(before)) {
    throw new Error(`Manager Incidents V1 could not find required block: ${label}`);
  }
  html = html.replace(before, after);
}

replaceRequired(
  `<div class="list">
            <article class="row"><div><b>Aire acondicionado</b><div class="muted">Recoleta 2C · severidad media</div></div><span>Chebot ya envió protocolo</span><span class="tag warn">Esperando huésped</span><span>Manager informado</span></article>
          </div>`,
  `<div class="list" id="manager-incidents-list">
            <article class="card"><b>Cargando incidencias…</b><p class="muted">Consultando Chebot Concierge Dev.</p></article>
          </div>`,
  'incidents demo row'
);

replaceRequired(
  '<b>Preview autenticada:</b> acceso, Propiedades, Estadías, Conocimiento y Solicitudes ya usan datos reales de Chebot Concierge Dev. Incidencias y Resultados continúan con datos ficticios de demostración.',
  '<b>Preview autenticada:</b> acceso, Propiedades, Estadías, Conocimiento, Solicitudes e Incidencias ya usan datos reales de Chebot Concierge Dev. Resultados continúa con datos ficticios de demostración.',
  'authenticated preview notice'
);

replaceRequired(
  'Preview autenticada. Propiedades, Estadías, Conocimiento y Solicitudes: datos reales QA. Incidencias y Resultados: demostración.',
  'Preview autenticada. Propiedades, Estadías, Conocimiento, Solicitudes e Incidencias: datos reales QA. Resultados: demostración.',
  'sidebar preview note'
);

replaceRequired(
  'Chebot Concierge Manager Web V1 · Preview autenticada · Propiedades, Estadías, Conocimiento y Solicitudes reales QA · Sin secretos reales.',
  'Chebot Concierge Manager Web V1 · Preview autenticada · Propiedades, Estadías, Conocimiento, Solicitudes e Incidencias reales QA · Sin secretos reales.',
  'footer preview note'
);

replaceRequired(
  '  <script src="/manager/manager-auth.js" defer></script>\n  <script src="/manager/manager-knowledge.js" defer></script>\n  <script src="/manager/manager-requests.js" defer></script>\n</body>',
  '  <script src="/manager/manager-auth.js" defer></script>\n  <script src="/manager/manager-knowledge.js" defer></script>\n  <script src="/manager/manager-requests.js" defer></script>\n  <script src="/manager/manager-incidents.js" defer></script>\n</body>',
  'manager requests script hook'
);

fs.writeFileSync(indexFile, html);
console.log('Manager Web Incidents real V1 installed.');
