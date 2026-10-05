const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, 'dist');
const managerDir = path.join(out, 'manager');
const indexFile = path.join(managerDir, 'index.html');
const backendKnowledgeUrl =
  'https://chebot-backend-git-concierge-v3-design-chebot.vercel.app/api/concierge/manager/knowledge';

if (!fs.existsSync(indexFile)) {
  throw new Error('dist/manager/index.html was not generated before Manager Knowledge V1.');
}

const browserJs = `
(() => {
  'use strict';

  const BACKEND_KNOWLEDGE_URL = ${JSON.stringify(backendKnowledgeUrl)};
  const TOKEN_KEY = 'chebot_manager_preview_access_token';
  const list = document.getElementById('manager-knowledge-list') || document.querySelector('#knowledge .quick');
  const authScreen = document.getElementById('manager-auth');

  if (!list) return;

  const categoryLabels = {
    arrival: 'Llegada',
    checkin: 'Check-in',
    checkout: 'Checkout',
    wifi: 'Wi-Fi',
    equipment: 'Equipamiento',
    rules: 'Reglas',
    luggage: 'Equipaje',
    parking: 'Estacionamiento',
    amenities: 'Servicios',
    incident_protocol: 'Protocolo de incidencia',
    service: 'Servicio',
    other: 'Otro'
  };

  const statusLabels = {
    review: 'En revisión',
    active: 'Activa',
    paused: 'Pausada',
    archived: 'Archivada'
  };

  const riskLabels = {
    normal: 'Riesgo normal',
    sensitive: 'Sensible',
    safety_review: 'Revisión de seguridad'
  };

  const sourceLabels = {
    manager_entered: 'Cargado por manager',
    learned_from_incident: 'Aprendido de incidencia',
    system_curated: 'Curado por sistema'
  };

  function text(value, fallback = '—') {
    const normalized = value === null || value === undefined ? '' : String(value).trim();
    return normalized || fallback;
  }

  function statusClass(statusValue) {
    const value = String(statusValue || '');
    if (value === 'active') return 'tag';
    if (value === 'review' || value === 'paused') return 'tag warn';
    if (value === 'archived') return 'tag danger';
    return 'tag';
  }

  function riskClass(riskValue) {
    const value = String(riskValue || '');
    if (value === 'safety_review') return 'tag danger';
    if (value === 'sensitive') return 'tag warn';
    return 'tag';
  }

  function scopeLabel(item) {
    const scope = item && item.scope ? item.scope : null;
    if (scope && scope.label) return String(scope.label);
    if (item && item.scope_type === 'account') return 'Cuenta';
    if (item && item.scope_type === 'building') return 'Edificio';
    if (item && item.scope_type === 'property') return 'Propiedad';
    return 'Alcance';
  }

  function addTag(container, label, className) {
    const tag = document.createElement('span');
    tag.className = className || 'tag';
    tag.textContent = label;
    container.appendChild(tag);
  }

  async function decideKnowledge(item, action, button) {
    const accessToken = sessionStorage.getItem(TOKEN_KEY);
    if (!accessToken || !item || !item.id || !item.version || !item.version.id) return;

    const approve = action === 'approve';
    const promptText = approve
      ? '¿Aprobar esta propuesta? Una vez aprobada, Chebot podrá usarla como conocimiento activo según su alcance y riesgo.'
      : '¿Rechazar esta propuesta? No se activará y quedará conservada en el historial.';

    if (!window.confirm(promptText)) return;

    const previousText = button.textContent;
    button.disabled = true;
    button.textContent = approve ? 'Aprobando…' : 'Rechazando…';

    try {
      const response = await fetch(BACKEND_KNOWLEDGE_URL, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-store',
        headers: {
          Authorization: 'Bearer ' + accessToken,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          action,
          knowledge_item_id: item.id,
          version_id: item.version.id
        })
      });

      let body = null;
      try { body = await response.json(); } catch (_) {}

      if (!response.ok || !body || body.ok !== true) {
        const code = body && body.error ? String(body.error) : 'KNOWLEDGE_DECISION_FAILED';
        if (code === 'SAFETY_REVIEW_REQUIRES_SECOND_APPROVER') {
          window.alert('Esta propuesta requiere una segunda aprobación por seguridad. No fue activada.');
        } else {
          window.alert('No se pudo completar la decisión. Código: ' + code);
        }
        return;
      }

      lastLoadedToken = null;
      await maybeLoadKnowledge();
    } catch (_) {
      window.alert('No se pudo conectar con Chebot Concierge. Reintentá en unos segundos.');
    } finally {
      button.disabled = false;
      button.textContent = previousText;
    }
  }

  function addDecisionButton(container, label, item, action, danger = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.style.padding = '8px 11px';
    button.style.borderRadius = '10px';
    button.style.cursor = 'pointer';
    button.style.fontWeight = '800';
    button.style.border = danger ? '1px solid #e7c8bd' : '1px solid #0f766e';
    button.style.background = danger ? '#fff' : '#0f766e';
    button.style.color = danger ? '#8b2f18' : '#fff';
    button.addEventListener('click', () => decideKnowledge(item, action, button));
    container.appendChild(button);
  }

  function renderKnowledge(items) {
    list.replaceChildren();

    if (!items.length) {
      const empty = document.createElement('article');
      empty.className = 'card';
      empty.style.gridColumn = '1 / -1';

      const title = document.createElement('b');
      title.textContent = 'Sin conocimiento cargado';

      const detail = document.createElement('p');
      detail.className = 'muted';
      detail.textContent = 'El backend respondió correctamente, pero esta cuenta todavía no tiene elementos de conocimiento.';

      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = '0 elementos reales';

      empty.append(title, detail, tag);
      list.appendChild(empty);
      return;
    }

    items.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'card';

      const title = document.createElement('b');
      title.textContent = text(item.knowledge_key, categoryLabels[item.category] || 'Conocimiento');

      const scope = document.createElement('span');
      scope.className = 'muted';
      scope.textContent =
        scopeLabel(item) + ' · ' + (categoryLabels[item.category] || text(item.category, 'Sin categoría'));

      const content = document.createElement('p');
      content.textContent = item.version && item.version.content
        ? String(item.version.content)
        : 'Sin versión disponible para mostrar.';

      const tags = document.createElement('div');
      tags.style.display = 'flex';
      tags.style.flexWrap = 'wrap';
      tags.style.gap = '6px';
      tags.style.marginTop = '10px';

      const visibleVersionIsDraft =
        item.version &&
        item.version.status === 'draft' &&
        item.version.is_current !== true;

      const visibleStatus = visibleVersionIsDraft ? 'review' : item.status;

      addTag(
        tags,
        statusLabels[visibleStatus] || text(visibleStatus, 'Sin estado'),
        statusClass(visibleStatus)
      );
      addTag(
        tags,
        riskLabels[item.risk_level] || text(item.risk_level, 'Riesgo no informado'),
        riskClass(item.risk_level)
      );

      if (item.version) {
        addTag(tags, 'v' + text(item.version.version_number, '?'), 'tag');
      }

      const versionMeta = document.createElement('div');
      versionMeta.className = 'muted';
      versionMeta.style.marginTop = '10px';
      versionMeta.style.fontSize = '.82rem';

      if (item.version) {
        const source = sourceLabels[item.version.source_type] || text(item.version.source_type, 'Fuente no informada');
        versionMeta.textContent =
          source +
          (item.version.is_current
            ? ' · versión actual'
            : visibleVersionIsDraft
              ? ' · propuesta pendiente'
              : ' · versión visible') +
          (visibleVersionIsDraft && item.current_version_number
            ? ' · v' + item.current_version_number + ' sigue activa'
            : '') +
          ' · ' +
          text(item.version_count, '0') +
          (Number(item.version_count) === 1 ? ' versión' : ' versiones');
      } else {
        versionMeta.textContent = text(item.version_count, '0') + ' versiones';
      }

      card.append(title, scope, content, tags, versionMeta);

      const isDraftReview = visibleVersionIsDraft;

      if (isDraftReview) {
        const reviewNote = document.createElement('p');
        reviewNote.className = 'muted';
        reviewNote.style.margin = '10px 0 0';
        reviewNote.style.fontSize = '.84rem';
        reviewNote.textContent = 'Propuesta pendiente: revisala antes de convertirla en conocimiento activo.';

        const decisions = document.createElement('div');
        decisions.style.display = 'flex';
        decisions.style.flexWrap = 'wrap';
        decisions.style.gap = '7px';
        decisions.style.marginTop = '10px';

        addDecisionButton(decisions, 'Aprobar', item, 'approve');
        addDecisionButton(decisions, 'Rechazar', item, 'reject', true);

        card.append(reviewNote, decisions);
      }

      list.appendChild(card);
    });
  }

  function renderKnowledgeError() {
    list.replaceChildren();

    const errorCard = document.createElement('article');
    errorCard.className = 'card';
    errorCard.style.gridColumn = '1 / -1';

    const title = document.createElement('b');
    title.textContent = 'No pudimos cargar el conocimiento';

    const detail = document.createElement('p');
    detail.className = 'muted';
    detail.textContent = 'La sesión sigue activa. Reintentá recargando la página.';

    errorCard.append(title, detail);
    list.appendChild(errorCard);
  }

  async function loadManagerKnowledge(accessToken) {
    const response = await fetch(BACKEND_KNOWLEDGE_URL, {
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

    if (!response.ok || !body || body.ok !== true || !Array.isArray(body.knowledge)) {
      const error = body && body.error ? String(body.error) : 'MANAGER_KNOWLEDGE_LOAD_FAILED';
      const e = new Error(error);
      e.code = error;
      throw e;
    }

    renderKnowledge(body.knowledge);
    return body.knowledge;
  }

  let lastLoadedToken = null;
  let loadSequence = 0;

  async function maybeLoadKnowledge() {
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
      const items = await loadManagerKnowledge(accessToken);
      if (sequence !== loadSequence) return;
      renderKnowledge(items);
    } catch (_) {
      if (sequence !== loadSequence) return;
      renderKnowledgeError();
    }
  }

  const observer = new MutationObserver(() => {
    maybeLoadKnowledge();
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

  window.addEventListener('pageshow', maybeLoadKnowledge);
  maybeLoadKnowledge();
})();
`;

fs.writeFileSync(path.join(managerDir, 'manager-knowledge.js'), browserJs);

let html = fs.readFileSync(indexFile, 'utf8');

function replaceRequired(before, after, label) {
  if (!html.includes(before)) {
    throw new Error(`Manager Knowledge V1 could not find required block: ${label}`);
  }
  html = html.replace(before, after);
}

replaceRequired(
  `<div class="quick">
              <article class="card"><b>Wi-Fi</b><span class="muted">Credencial protegida</span><div class="secret">••••••••</div><span class="demo-lock">🔒 Valor oculto por defecto</span></article>
              <article class="card"><b>Checkout</b><span class="muted">Versión activa</span><p>Salida estándar 11:00. Cambios futuros requieren regla o aprobación.</p></article>
              <article class="card"><b>Reglas del edificio</b><span class="muted">Building scope</span><p>Silencio desde las 23:00.</p></article>
              <article class="card"><b>Revisión pendiente</b><span class="muted">Safety review</span><p>1 instrucción pausada hasta segunda aprobación.</p></article>
            </div>`,
  `<div class="quick" id="manager-knowledge-list">
              <article class="card" style="grid-column:1/-1"><b>Cargando conocimiento…</b><p class="muted">Consultando Chebot Concierge Dev.</p></article>
            </div>`,
  'knowledge demo cards'
);

replaceRequired(
  '<b>Preview autenticada:</b> acceso, Propiedades y Estadías ya usan datos reales de Chebot Concierge Dev. Las demás secciones continúan con datos ficticios de demostración.',
  '<b>Preview autenticada:</b> acceso, Propiedades, Estadías y Conocimiento ya usan datos reales de Chebot Concierge Dev. Solicitudes, Incidencias y Resultados continúan con datos ficticios de demostración.',
  'authenticated preview notice'
);

replaceRequired(
  'Preview autenticada. Propiedades y Estadías: datos reales QA. Resto del panel: demostración.',
  'Preview autenticada. Propiedades, Estadías y Conocimiento: datos reales QA. Solicitudes, Incidencias y Resultados: demostración.',
  'sidebar preview note'
);

replaceRequired(
  'Chebot Concierge Manager Web V1 · Preview autenticada · Propiedades y Estadías reales QA · Sin secretos reales.',
  'Chebot Concierge Manager Web V1 · Preview autenticada · Propiedades, Estadías y Conocimiento reales QA · Sin secretos reales.',
  'footer preview note'
);

replaceRequired(
  '  <script src="/manager/manager-auth.js" defer></script>\n</body>',
  '  <script src="/manager/manager-auth.js" defer></script>\n  <script src="/manager/manager-knowledge.js" defer></script>\n</body>',
  'manager auth script hook'
);

fs.writeFileSync(indexFile, html);
console.log('Manager Web Knowledge real V1 installed.');
