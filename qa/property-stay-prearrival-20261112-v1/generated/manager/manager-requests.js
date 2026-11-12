
(() => {
  'use strict';

  const BACKEND_REQUESTS_URL = "https://fictional-api.example.invalid/api/concierge/manager/requests";
  const BACKEND_REQUEST_DECISION_URL = "https://fictional-api.example.invalid/api/concierge/manager/requests/decision";
  const TOKEN_KEY = 'chebot_manager_preview_access_token';

  // Durable identity is persisted before dispatch; legacy/unknown markers are
  // never converted into permission to retry. This is not server-side auth.
  function durableManagerIntentPending(key) {
    return sessionStorage.getItem(key) !== null || sessionStorage.getItem(key + ':durable-intent-v2') !== null;
  }
  function beginManagerDurableIntent(key) {
    if (durableManagerIntentPending(key)) throw new Error('MANAGER_INTENT_REVIEW_REQUIRED');
    const id = window.crypto.randomUUID();
    if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new Error('MANAGER_INTENT_UNAVAILABLE');
    const saved = JSON.stringify({version:2,intentId:id.toLowerCase()}), durableKey = key + ':durable-intent-v2';
    sessionStorage.setItem(durableKey, saved);
    if (sessionStorage.getItem(durableKey) !== saved) throw new Error('MANAGER_INTENT_NOT_PERSISTED');
    sessionStorage.setItem(key, '1');
    if (sessionStorage.getItem(key) !== '1') throw new Error('MANAGER_INTENT_NOT_PERSISTED');
    return id.toLowerCase();
  }
  function clearManagerDurableIntent(key) {
    sessionStorage.removeItem(key + ':durable-intent-v2');
    sessionStorage.removeItem(key);
    if (durableManagerIntentPending(key)) throw new Error('MANAGER_INTENT_NOT_CLEARED');
  }
  function preserveManagerDurableIntent(key) {
    try { if (sessionStorage.getItem(key) === null) sessionStorage.setItem(key, '1'); } catch (_) {}
  }

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

      const decision = document.createElement('div');

      if (item.status === 'new' || item.status === 'waiting_manager') {
        decision.style.display = 'flex';
        decision.style.flexWrap = 'wrap';
        decision.style.gap = '6px';

        const approve = document.createElement('button');
        approve.type = 'button';
        approve.textContent = 'Aprobar';
        approve.style.border = '0';
        approve.style.borderRadius = '9px';
        approve.style.padding = '8px 10px';
        approve.style.fontWeight = '850';
        approve.style.cursor = 'pointer';
        approve.style.background = '#0f766e';
        approve.style.color = '#fff';

        const reject = document.createElement('button');
        reject.type = 'button';
        reject.textContent = 'Rechazar';
        reject.style.border = '1px solid #e5ddd0';
        reject.style.borderRadius = '9px';
        reject.style.padding = '8px 10px';
        reject.style.fontWeight = '850';
        reject.style.cursor = 'pointer';
        reject.style.background = '#fff';
        reject.style.color = '#8a3325';

        const reviewKey = 'chebot_manager_request_review_v1:' + item.id;
        const renderedToken = readSectionToken(), renderedSequence = loadSequence;
        const currentView = () => renderedToken && readSectionToken() === renderedToken && renderedSequence === loadSequence &&
          !document.body.classList.contains('manager-auth-pending');
        const reviewBlocked = () => { try { return durableManagerIntentPending(reviewKey); } catch (_) { return true; } };
        if (reviewBlocked()) {
          approve.disabled = true; reject.disabled = true;
          const review = document.createElement('span');
          review.textContent = 'Resultado en revisión. No repitas la decisión; verificá el registro con soporte.';
          decision.appendChild(review);
        }
        const runDecision = async (decisionValue) => {
          if (approve.disabled || reject.disabled || reviewBlocked() || !currentView()) return;
          let requestStarted = false;
          let responseReceived = false;
          let decisionConfirmed = false;
          let reconciliationRequired = false;
          let intentRecorded = false;
          let stableIntentId = null;
          const verb = decisionValue === 'approved' ? 'aprobar' : 'rechazar';
          if (!window.confirm('¿Confirmás ' + verb + ' esta solicitud?')) return;
          if (!currentView()) return;

          approve.disabled = true;
          reject.disabled = true;

          try {
            const accessToken = readSectionToken();
            if (!accessToken || accessToken !== renderedToken || !currentView()) {
              throw new Error('AUTH_REQUIRED');
            }
            const actionSequence = loadSequence;

            const payload = {
              request_id: item.id,
              decision: decisionValue
            };

            if (
              decisionValue === 'approved' &&
              (item.request_type === 'early_checkin' || item.request_type === 'late_checkout') &&
              item.requested_at_time
            ) {
              payload.approved_at_time = item.requested_at_time;
            }

            // Persist BEFORE dispatch: navigation, reload or a new render must
            // not lose an in-flight action whose acknowledgement is unknown.
            try {
              stableIntentId = beginManagerDurableIntent(reviewKey);
              intentRecorded = true;
            } catch (_) { throw new Error('REQUEST_INTENT_UNAVAILABLE'); }
            requestStarted = true;
            const response = await fetchManager(BACKEND_REQUEST_DECISION_URL, {
              method: 'POST',
              mode: 'cors',
              cache: 'no-store',
              headers: {
                Authorization: 'Bearer ' + accessToken,
                'Idempotency-Key': stableIntentId,
                'Content-Type': 'application/json',
                Accept: 'application/json'
              },
              body: JSON.stringify(payload)
            });

            responseReceived = true;
            let body = null;
            try { body = await response.json(); } catch (_) {}

            if (actionSequence !== loadSequence || readSectionToken() !== accessToken || document.body.classList.contains('manager-auth-pending')) {
              reconciliationRequired = true;
              throw new Error('AUTH_REQUIRED');
            }
            if (!response.ok || !body || body.ok !== true || body.reconciliation_required === true) {
              const preDispatchCodes = ['AUTH_HEADER_REQUIRED','AUTH_TOKEN_INVALID','MANAGER_ACCESS_DENIED','MANAGER_PERMISSION_DENIED','CORS_ORIGIN_NOT_ALLOWED','REQUEST_ID_INVALID','INVALID_REQUEST_DECISION','INVALID_APPROVED_VALUE','INVALID_REQUEST_DECISION_SUMMARY','INVALID_APPROVED_AT_TIME','INVALID_APPROVED_UNTIL','RESOURCE_OUT_OF_SCOPE'];
              const knownDenial = body && body.ok === false && body.reconciliation_required !== true &&
                (([400,401,403,404,405].includes(response.status) && preDispatchCodes.includes(body.error)) ||
                 response.status === 503 && body.error === 'MANAGER_OPERATIONS_NOT_RELEASED');
              reconciliationRequired = !knownDenial || body.reconciliation_required === true;
              const code = body && body.error ? String(body.error) : 'REQUEST_DECISION_FAILED';
              throw new Error(code);
            }

            const receipt = body.decision;
            if (!receipt || Array.isArray(receipt) || Object.keys(receipt).sort().join('|') !== 'effective_time|request_id|resulting_status|stay_updated' ||
                receipt.request_id !== item.id || receipt.resulting_status !== decisionValue || typeof receipt.stay_updated !== 'boolean' ||
                receipt.effective_time !== null && (typeof receipt.effective_time !== 'string' || !Number.isFinite(Date.parse(receipt.effective_time)))) {
              reconciliationRequired = true;
              throw new Error('REQUEST_DECISION_RESPONSE_INVALID');
            }
            decisionConfirmed = true;
            if (body.notification && body.notification.reconciliation_required === true) {
              window.alert('La decisión quedó registrada. El aviso al huésped sigue en revisión; no repitas la decisión ni el envío. Revisá el registro con soporte.');
            }
            const refreshed = await loadManagerRequests(accessToken);
            if (actionSequence !== loadSequence || !currentView()) return;
            const matching = Array.isArray(refreshed) ? refreshed.filter(row => row.id === item.id) : [];
            if (matching.length !== 1 || matching[0].property_id !== item.property_id || matching[0].stay_id !== item.stay_id ||
                matching[0].status !== decisionValue) throw new Error('REQUEST_REFRESH_UNCONFIRMED');
            renderRequests(refreshed);
          } catch (error) {
            // The persisted intent stays for reconciliation, but an old page
            // or bearer must not alert or alter a newer manager's view.
            if (!currentView()) return;
            if (error && error.message === 'REQUEST_INTENT_UNAVAILABLE') {
              approve.disabled = true; reject.disabled = true;
              window.alert('No pude preparar la acción de forma segura. No se envió la decisión. Cerrá y volvé a abrir esta página antes de continuar.');
              return;
            }
            if (requestStarted && (!responseReceived || reconciliationRequired || decisionConfirmed)) {
              preserveManagerDurableIntent(reviewKey);
              approve.disabled = true; reject.disabled = true;
              window.alert(decisionConfirmed
                ? 'La decisión se registró, pero falta actualizar la vista. Recargá para revisar el estado; no la repitas.'
                : 'La decisión pudo haberse registrado. No la repitas hasta revisar el resultado con soporte.');
              return;
            }
            if (intentRecorded) {
              try {
                clearManagerDurableIntent(reviewKey);
              } catch (_) {
                approve.disabled = true; reject.disabled = true;
                window.alert('La acción sigue bloqueada hasta revisar su estado. No repitas la decisión.');
                return;
              }
            }
            approve.disabled = false;
            reject.disabled = false;
            const explanations = {
              AUTH_REQUIRED: 'La sesión venció. Volvé a iniciar sesión.',
              MANAGER_OPERATIONS_NOT_RELEASED: 'La operación sigue pausada. No se ejecutó ninguna decisión. Consultá a Che Vení antes de continuar.',
              MANAGER_PERMISSION_DENIED: 'No tenés permiso para decidir esta solicitud. Consultá al manager principal.',
              GUEST_RUNTIME_AUTHORITY_REQUIRED: 'La solicitud está pausada hasta validar la autorización del huésped.',
              INVALID_EARLY_CHECKIN_TIME: 'La hora indicada no adelanta el ingreso. Revisá el horario.',
              INVALID_LATE_CHECKOUT_TIME: 'La hora indicada no extiende la salida. Revisá el horario.',
              STAY_ACCESS_OVERLAP: 'Ese horario se superpone con otra estadía. Revisá las fechas.'
            };
            window.alert(explanations[error && error.message] ||
              'No pude registrar la decisión. Revisá el estado con soporte antes de intentar otra acción.');
          }
        };

        approve.addEventListener('click', () => runDecision('approved'));
        reject.addEventListener('click', () => runDecision('rejected'));
        decision.append(approve, reject);
      } else if (item.decision_at) {
        const decided = document.createElement('span');
        decided.textContent = 'Decidida: ' + text(formatDateTime(item.decision_at), '—');
        decision.appendChild(decided);
      } else {
        const registered = document.createElement('span');
        registered.textContent = 'Solicitud registrada';
        decision.appendChild(registered);
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
    detail.textContent = 'No pudimos comprobar esta sección. Volvé a verificar el acceso antes de continuar.';
    errorCard.append(title, detail);
    list.appendChild(errorCard);
    const metric = Array.from(document.querySelectorAll('.metric')).find((card) =>
      card.querySelector('small')?.textContent.trim() === 'Solicitudes pendientes'
    );
    if (metric) {
      const number = metric.querySelector('b');
      const tag = metric.querySelector('.tag');
      if (number) number.textContent = '—';
      if (tag) { tag.textContent = 'No disponible'; tag.className = 'tag warn'; }
    }
  }

  function readSectionToken() {
    try { return sessionStorage.getItem(TOKEN_KEY); }
    catch (_) { if (!document.body.classList.contains('manager-auth-pending')) window.dispatchEvent(new Event('cheveni-manager-session-denied')); return null; }
  }

  async function fetchManager(url, options) {
    const sequence = loadSequence;
    const accessToken = options.headers && String(options.headers.Authorization || '').replace(/^Bearer /, '');
    const controller = new AbortController();
    let timer;
    const deadline = new Promise((_, reject) => {
      timer = setTimeout(() => { controller.abort(); reject(new Error('MANAGER_REQUEST_TIMEOUT')); }, 8000);
    });
    try {
      // Bound headers AND body even if an adapter ignores abort. A mutation
      // timeout is an unknown result; callers retain their persisted intent.
      return await Promise.race([deadline, (async () => {
        const response = await fetch(url, {...options, redirect: 'error', signal: controller.signal});
        // A current authorization denial invalidates cached private UI too.
        if ([401, 403].includes(response.status) && sequence === loadSequence && readSectionToken() === accessToken
            && !document.body.classList.contains('manager-auth-pending')) {
          window.dispatchEvent(new Event('cheveni-manager-session-denied'));
        }
        let body = null;
        try { body = await response.json(); } catch (_) {}
        return {ok: response.ok, status: response.status, json: async () => body};
      })()]);
    } finally { clearTimeout(timer); }
  }

  async function loadManagerRequests(accessToken) {
    const response = await fetchManager(BACKEND_REQUESTS_URL, {
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
    const accessToken = readSectionToken();

    if (!panelVisible || !accessToken) {
      lastLoadedToken = null;
      ++loadSequence;
      list.replaceChildren();
      return;
    }

    if (accessToken === lastLoadedToken) return;

    const sequence = ++loadSequence;
    lastLoadedToken = accessToken;

    try {
      const items = await loadManagerRequests(accessToken);
      if (sequence !== loadSequence || readSectionToken() !== accessToken || document.body.classList.contains('manager-auth-pending')) return;
      renderRequests(items);
    } catch (_) {
      if (sequence !== loadSequence || readSectionToken() !== accessToken || document.body.classList.contains('manager-auth-pending')) return;
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

  // Invalidate before the browser can suspend observer delivery into BFCache.
  window.addEventListener('pagehide', () => { ++loadSequence; lastLoadedToken = null; list.replaceChildren(); });
  window.addEventListener('pageshow', maybeLoadRequests);
  maybeLoadRequests();
})();
