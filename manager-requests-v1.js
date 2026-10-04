const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, 'dist');
const managerDir = path.join(out, 'manager');
const indexFile = path.join(managerDir, 'index.html');
const backendRequestsUrl =
  'https://chebot-backend-git-concierge-v3-design-chebot.vercel.app/api/concierge/manager/requests';

if (!fs.existsSync(indexFile)) {
  throw new Error('dist/manager/index.html was not generated before Manager Requests V1.');
}

const browserJs = `
(() => {
  'use strict';

  const BACKEND_REQUESTS_URL = ${JSON.stringify(backendRequestsUrl)};
  const TOKEN_KEY = 'chebot_manager_preview_access_token';
  const list = document.getElementById('manager-requests-list') || document.querySelector('#solicitudes .list');
  const authScreen = document.getElementById('manager-auth');

  if (!list) return;

  const typeLabels = {
    early_checkin: 'Early check-in',
    late_checkout: 'Late checkout',
    luggage: 'Equipaje',
    parking: 'Estacionamiento',
    cleaning: 'Limpieza',
    extra_items: 'Elementos extra',
    special_request: 'Solicitud especial',
    other: 'Otra solicitud'
  };

  const statusLabels = {
    new: 'Nueva',
    waiting_manager: 'Pendiente',
    approved: 'Aprobada',
    rejected: 'Rechazada',
    communicated: 'Comunicada',
    completed: 'Completada',
    cancelled: 'Cancelada'
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

  function statusClass(statusValue) {
    const value = String(statusValue || '');
    if (value === 'new' || value === 'waiting_manager') return 'tag warn';
    if (value === 'rejected' || value === 'cancelled') return 'tag danger';
    return 'tag';
  }

  function renderPendingMetric(items) {
    const metrics = Array.from(document.querySelectorAll('.metric'));
    const card = metrics.find((item) => {
      const small = item.querySelector('small');
      return small && small.textContent.trim() === 'Solicitudes pendientes';
    });

    if (!card) return;

    const pendingCount = items.filter((item) =>
      item && (item.status === 'new' || item.status === 'waiting_manager')
    ).length;

    const number = card.querySelector('b');
    const tag = card.querySelector('.tag');

    if (number) number.textContent = String(pendingCount);
    if (tag) {
      tag.textContent = pendingCount === 1 ? '1 decisión requerida' : pendingCount + ' decisiones requeridas';
      tag.className = pendingCount > 0 ? 'tag warn' : 'tag';
    }
  }

  function renderRequests(items) {
    list.replaceChildren();
    renderPendingMetric(items);

    if (!items.length) {
      const empty = document.createElement('article');
      empty.className = 'card';
      const title = document.createElement('b');
      title.textContent = 'Sin solicitudes';
      const detail = document.createElement('p');
      detail.className = 'muted';
      detail.textContent = 'No hay solicitudes reales para las propiedades autorizadas.';
      empty.append(title, detail);
      list.appendChild(empty);
      return;
    }

    items.forEach((item) => {
      const row = document.createElement('article');
      row.className = 'row';

      const identity = document.createElement('div');
      const title = document.createElement('b');
      title.textContent = typeLabels[item.request_type] || text(item.request_type, 'Solicitud');

      const propertyName = item.property && item.property.internal_name
        ? String(item.property.internal_name)
        : 'Propiedad autorizada';
      const detail = document.createElement('div');
      detail.className = 'muted';
      detail.textContent = propertyName + ' · ' + text(item.requested_value, 'Sin detalle adicional');
      identity.append(title, detail);

      const timing = document.createElement('span');
      const requestedTime = formatDateTime(item.requested_at_time);
      timing.textContent = requestedTime
        ? 'Solicitado: ' + requestedTime
        : 'Creada: ' + text(formatDateTime(item.created_at), '—');

      const statusTag = document.createElement('span');
      statusTag.className = statusClass(item.status);
      statusTag.textContent = statusLabels[item.status] || text(item.status, 'Sin estado');

      const decision = document.createElement('span');
      if (item.status === 'new' || item.status === 'waiting_manager') {
        decision.textContent = 'Chebot espera tu decisión';
      } else if (item.decision_at) {
        decision.textContent = 'Decidida: ' + text(formatDateTime(item.decision_at), '—');
      } else {
        decision.textContent = 'Solicitud registrada';
      }

      row.append(identity, timing, statusTag, decision);
      list.appendChild(row);
    });
  }

  function renderRequestsError() {
    list.replaceChildren();

    const errorCard = document.createElement('article');
    errorCard.className = 'card';
    const title = document.createElement('b');
    title.textContent = 'No pudimos cargar las solicitudes';
    const detail = document.createElement('p');
    detail.className = 'muted';
    detail.textContent = 'La sesión sigue activa. Reintentá recargando la página.';
    errorCard.append(title, detail);
    list.appendChild(errorCard);
  }

  async function loadManagerRequests(accessToken) {
    const response = await fetch(BACKEND_REQUESTS_URL, {
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

    if (!response.ok || !body || body.ok !== true || !Array.isArray(body.requests)) {
      const error = body && body.error ? String(body.error) : 'MANAGER_REQUESTS_LOAD_FAILED';
      const e = new Error(error);
      e.code = error;
      throw e;
    }

    return body.requests;
  }

  let lastLoadedToken = null;
  let loadSequence = 0;

  async function maybeLoadRequests() {
    const panelVisible = !document.body.classList.contains('manager-auth-pending');
    const accessToken = sessionStorage.getItem(TOKEN_KEY);

    if (!panelVisible || !accessToken) {
      lastLoadedToken = null;
      return;
    }

    if (accessToken === lastLoadedToken) return;

    const sequence = ++loadSequence;
    lastLoadedToken = accessToken;

    try {
      const items = await loadManagerRequests(accessToken);
      if (sequence !== loadSequence) return;
      renderRequests(items);
    } catch (_) {
      if (sequence !== loadSequence) return;
      renderRequestsError();
    }
  }

  const observer = new MutationObserver(() => {
    maybeLoadRequests();
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

  window.addEventListener('pageshow', maybeLoadRequests);
  maybeLoadRequests();
})();
`;

fs.writeFileSync(path.join(managerDir, 'manager-requests.js'), browserJs);

let html = fs.readFileSync(indexFile, 'utf8');

function replaceRequired(before, after, label) {
  if (!html.includes(before)) {
    throw new Error(`Manager Requests V1 could not find required block: ${label}`);
  }
  html = html.replace(before, after);
}

replaceRequired(
  `<div class="list">
            <article class="row"><div><b>Early check-in · Mariela</b><div class="muted">Recoleta 2C · solicita 11:00</div></div><span>Hoy</span><span class="tag warn">Pendiente</span><span>Chebot espera tu decisión</span></article>
            <article class="row"><div><b>Late checkout · Martina</b><div class="muted">Palermo 1B · solicita 13:00</div></div><span>Mañana</span><span class="tag warn">Pendiente</span><span>Revisar próxima estadía</span></article>
          </div>`,
  `<div class="list" id="manager-requests-list">
            <article class="card"><b>Cargando solicitudes…</b><p class="muted">Consultando Chebot Concierge Dev.</p></article>
          </div>`,
  'requests demo rows'
);

replaceRequired(
  '<b>Preview autenticada:</b> acceso, Propiedades, Estadías y Conocimiento ya usan datos reales de Chebot Concierge Dev. Solicitudes, Incidencias y Resultados continúan con datos ficticios de demostración.',
  '<b>Preview autenticada:</b> acceso, Propiedades, Estadías, Conocimiento y Solicitudes ya usan datos reales de Chebot Concierge Dev. Incidencias y Resultados continúan con datos ficticios de demostración.',
  'authenticated preview notice'
);

replaceRequired(
  'Preview autenticada. Propiedades, Estadías y Conocimiento: datos reales QA. Solicitudes, Incidencias y Resultados: demostración.',
  'Preview autenticada. Propiedades, Estadías, Conocimiento y Solicitudes: datos reales QA. Incidencias y Resultados: demostración.',
  'sidebar preview note'
);

replaceRequired(
  'Chebot Concierge Manager Web V1 · Preview autenticada · Propiedades, Estadías y Conocimiento reales QA · Sin secretos reales.',
  'Chebot Concierge Manager Web V1 · Preview autenticada · Propiedades, Estadías, Conocimiento y Solicitudes reales QA · Sin secretos reales.',
  'footer preview note'
);

replaceRequired(
  '  <script src="/manager/manager-auth.js" defer></script>\n  <script src="/manager/manager-knowledge.js" defer></script>\n</body>',
  '  <script src="/manager/manager-auth.js" defer></script>\n  <script src="/manager/manager-knowledge.js" defer></script>\n  <script src="/manager/manager-requests.js" defer></script>\n</body>',
  'manager knowledge script hook'
);

fs.writeFileSync(indexFile, html);
console.log('Manager Web Requests real V1 installed.');
