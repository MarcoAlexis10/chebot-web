
(() => {
  'use strict';

  const SUPABASE_URL = "https://fictional-auth.example.invalid";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_FICTIONAL_ONLY";
  const BACKEND_SESSION_URL = "https://fictional-api.example.invalid/api/concierge/manager/session";
  const BACKEND_PROPERTIES_URL = "https://fictional-api.example.invalid/api/concierge/manager/properties";
  const BACKEND_STAYS_URL = "https://fictional-api.example.invalid/api/concierge/manager/stays";
  const TOKEN_KEY = 'chebot_manager_preview_access_token';
  let authGeneration = 0;
  let signingOut = false;
  let storageHealthy = true;
  let recoveryGeneration = 0;
  let recoveryController = null;
  let recoveryPending = false;

  const authScreen = document.getElementById('manager-auth');
  const form = document.getElementById('manager-login-form');
  const email = document.getElementById('manager-email');
  const password = document.getElementById('manager-password');
  const passwordVisibility = document.getElementById('manager-password-visibility');
  const status = document.getElementById('manager-auth-status');
  const submit = document.getElementById('manager-login-submit');
  const logout = document.getElementById('manager-logout');
  const forgot = document.getElementById('manager-forgot');
  const recoveryForm = document.getElementById('manager-recovery-form');
  const recoveryEmail = document.getElementById('manager-recovery-email');
  const recoverySubmit = document.getElementById('manager-recovery-submit');
  const recoveryCancel = document.getElementById('manager-recovery-cancel');
  const recoveryStatus = document.getElementById('manager-recovery-status');
  const sessionLabel = document.getElementById('manager-session-label');
  const accountLabel = document.getElementById('manager-account-label');

  function setStatus(message, kind) {
    status.textContent = message || '';
    status.className = 'manager-auth-status' + (kind ? ' ' + kind : '');
  }

  function recoveryMessage(message, kind) {
    recoveryStatus.textContent = message || '';
    recoveryStatus.className = 'manager-auth-status' + (kind ? ' ' + kind : '');
  }

  function concealManagerPassword() {
    password.type = 'password';
    passwordVisibility.setAttribute('aria-pressed', 'false');
    passwordVisibility.setAttribute('aria-label', 'Mostrar contraseña');
  }

  passwordVisibility.addEventListener('click', () => {
    const visible = password.type === 'password';
    password.type = visible ? 'text' : 'password';
    passwordVisibility.setAttribute('aria-pressed', String(visible));
    passwordVisibility.setAttribute('aria-label', visible ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });

  function cancelRecovery() {
    recoveryGeneration += 1;
    if (recoveryController) recoveryController.abort();
    recoveryController = null;
    recoveryPending = false;
    recoverySubmit.disabled = false;
  }

  function toggleRecovery(open) {
    cancelRecovery();
    recoveryForm.hidden = !open;
    forgot.setAttribute('aria-expanded', open ? 'true' : 'false');
    forgot.hidden = open;
    form.hidden = open;
    if (open) {
      recoveryEmail.value = email.value.trim();
      recoveryMessage('');
      recoveryEmail.focus();
    } else {
      recoveryMessage('');
      recoveryEmail.value = '';
      password.value = '';
      concealManagerPassword();
      email.focus();
    }
  }

  function readToken() {
    if (!storageHealthy) return '';
    try { return sessionStorage.getItem(TOKEN_KEY) || ''; }
    catch (_) { storageHealthy = false; showLogin(''); return ''; }
  }

  function clearToken() {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      if (sessionStorage.getItem(TOKEN_KEY) !== null) throw new Error('TOKEN_NOT_CLEARED');
      return true;
    }
    catch (_) { storageHealthy = false; return false; }
  }

  function storeToken(token) {
    try {
      if (!storageHealthy) throw new Error('BROWSER_STORAGE_UNAVAILABLE');
      sessionStorage.setItem(TOKEN_KEY, token);
      if (sessionStorage.getItem(TOKEN_KEY) !== token) throw new Error('TOKEN_NOT_PERSISTED');
    }
    catch (_) { storageHealthy = false; throw new Error('BROWSER_STORAGE_UNAVAILABLE'); }
  }

  async function fetchAuth(url, options) {
    const controller = new AbortController(), external = options.signal;
    const generation = authGeneration;
    const accessToken = String(options.headers && options.headers.Authorization || '').replace(/^Bearer /, '');
    let cancel;
    const aborted = new Promise((_, reject) => {
      cancel = () => { controller.abort(); reject(new Error('AUTH_REQUEST_UNCONFIRMED')); };
    });
    if (external) external.addEventListener('abort', cancel, {once: true});
    const timer = setTimeout(cancel, 8000);
    try {
      if (external && external.aborted) { cancel(); return await aborted; }
      // One deadline through headers and JSON, even if an adapter ignores abort.
      // This never retries login, recovery or logout after an unknown outcome.
      return await Promise.race([aborted, (async () => {
        const response = await fetch(url, {...options, signal: controller.signal});
        // A current authorization denial invalidates cached private UI too.
        if ([401, 403].includes(response.status) && [BACKEND_SESSION_URL, BACKEND_PROPERTIES_URL, BACKEND_STAYS_URL].includes(url) &&
            generation === authGeneration && accessToken && readToken() === accessToken) {
          showLogin('La sesión dejó de estar autorizada. Iniciá sesión nuevamente.');
        }
        let body = null;
        try { body = await response.json(); } catch (_) {}
        return {ok: response.ok, status: response.status, json: async () => body};
      })()]);
    } finally {
      clearTimeout(timer);
      if (external) external.removeEventListener('abort', cancel);
    }
  }

  async function revokeSession(accessToken) {
    if (!accessToken) return true;
    const controller = new AbortController();
    try {
      const response = await fetchAuth(SUPABASE_URL + '/auth/v1/logout?scope=local', {
        method: 'POST',
        cache: 'no-store',
        redirect: 'error',
        referrerPolicy: 'no-referrer',
        signal: controller.signal,
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: 'Bearer ' + accessToken
        }
      });
      return response.ok;
    } catch (_) {
      return false;
    }
  }

  function clearPanelData() {
    for (const selector of ['#propiedades .list', '#estadias .list', '#manager-knowledge-list', '#manager-requests-list', '#manager-incidents-list']) {
      const list = document.querySelector(selector);
      if (list) list.replaceChildren();
    }
    document.querySelectorAll('.metric').forEach((card) => {
      const number = card.querySelector('b');
      const tag = card.querySelector('.tag');
      if (number) number.textContent = '—';
      if (tag) { tag.textContent = 'Cargando…'; tag.className = 'tag'; }
    });
  }

  function showLogin(message) {
    authGeneration += 1;
    document.body.classList.add('manager-auth-pending');
    clearPanelData();
    clearToken();
    authScreen.hidden = false;
    toggleRecovery(false);
    const notice = storageHealthy ? message : 'No pudimos asegurar el almacenamiento de esta pestaña. Cerrala y abrí una nueva para ingresar.';
    setStatus(notice || '', notice ? 'error' : '');
    submit.disabled = !storageHealthy;
    password.value = '';
    concealManagerPassword();
    setTimeout(() => email.focus(), 0);
  }

  function showPanel(session) {
    password.value = '';
    concealManagerPassword();
    authScreen.hidden = true;
    document.body.classList.remove('manager-auth-pending');
    const role = session && session.role ? String(session.role) : 'manager';
    sessionLabel.textContent = 'Sesión verificada · ' + role;
    accountLabel.textContent = 'Che Vení Concierge · ' + role;
  }

  function propertyStatusLabel(statusValue) {
    const labels = {
      active: 'Activa',
      ready_for_review: 'Lista para revisión',
      draft: 'Borrador',
      paused: 'Pausada',
      archived: 'Archivada'
    };
    return labels[String(statusValue || '')] || String(statusValue || 'Sin estado');
  }

  function renderPropertyMetric(properties) {
    const metrics = Array.from(document.querySelectorAll('.metric'));
    const card = metrics.find((item) => {
      const small = item.querySelector('small');
      return small && small.textContent.trim() === 'Propiedades activas';
    });

    if (!card) return;

    const activeCount = properties.filter((property) => property.property_status === 'active').length;
    const totalCount = properties.length;
    const number = card.querySelector('b');
    const tag = card.querySelector('.tag');

    if (number) number.textContent = String(activeCount);
    if (tag) {
      tag.textContent = totalCount === 1 ? '1 propiedad real' : totalCount + ' propiedades reales';
      tag.className = 'tag';
    }
  }

  function renderProperties(properties) {
    const list = document.querySelector('#propiedades .list');
    if (!list) return;

    list.replaceChildren();

    if (!properties.length) {
      const empty = document.createElement('article');
      empty.className = 'card';
      const title = document.createElement('b');
      title.textContent = 'Sin propiedades disponibles';
      const detail = document.createElement('p');
      detail.className = 'muted';
      detail.textContent = 'No hay propiedades autorizadas para esta cuenta.';
      empty.append(title, detail);
      list.appendChild(empty);
      renderPropertyMetric([]);
      return;
    }

    properties.forEach((property) => {
      const row = document.createElement('article');
      row.className = 'row';

      const identity = document.createElement('div');
      const name = document.createElement('b');
      name.textContent = String(property.internal_name || 'Propiedad');
      const source = document.createElement('div');
      source.className = 'muted';
      source.textContent = 'Concierge Dev · dato real';
      identity.append(name, source);

      const statusTag = document.createElement('span');
      statusTag.className =
        property.property_status === 'active'
          ? 'tag'
          : property.property_status === 'ready_for_review'
            ? 'tag warn'
            : 'tag';
      statusTag.textContent = propertyStatusLabel(property.property_status);

      const role = document.createElement('span');
      role.textContent = 'Acceso: ' + String(property.member_role || 'manager');

      const enabledPermissions = [
        property.can_manage_stays && 'estadías',
        property.can_manage_incidents && 'incidencias',
        property.can_approve_requests && 'solicitudes',
        property.can_manage_knowledge && 'conocimiento',
        property.can_manage_secrets && 'secretos',
        property.can_manage_team && 'equipo'
      ].filter(Boolean);

      const permissions = document.createElement('span');
      permissions.textContent = enabledPermissions.length
        ? 'Permisos: ' + enabledPermissions.join(', ')
        : 'Sin permisos operativos';

      row.append(identity, statusTag, role, permissions);
      list.appendChild(row);
    });

    renderPropertyMetric(properties);
  }

  function renderPropertiesError() {
    if (document.body.classList.contains('manager-auth-pending')) return;
    const list = document.querySelector('#propiedades .list');
    if (!list) return;
    list.replaceChildren();

    const errorCard = document.createElement('article');
    errorCard.className = 'card';
    const title = document.createElement('b');
    title.textContent = 'No pudimos cargar las propiedades';
    const detail = document.createElement('p');
    detail.className = 'muted';
    detail.textContent = 'No pudimos comprobar esta sección. Volvé a verificar el acceso antes de continuar.';
    errorCard.append(title, detail);
    list.appendChild(errorCard);
    const metric = Array.from(document.querySelectorAll('.metric')).find((card) =>
      card.querySelector('small')?.textContent.trim() === 'Propiedades activas'
    );
    if (metric) {
      const number = metric.querySelector('b');
      const tag = metric.querySelector('.tag');
      if (number) number.textContent = '—';
      if (tag) { tag.textContent = 'No disponible'; tag.className = 'tag warn'; }
    }
  }

  async function loadManagerProperties(accessToken) {
    const generation = authGeneration;
    const response = await fetchAuth(BACKEND_PROPERTIES_URL, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
        redirect: 'error',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        Accept: 'application/json'
      }
    });

    let body = null;
    try { body = await response.json(); } catch (_) {}

    if (generation !== authGeneration || readToken() !== accessToken) return [];
    if (response.status === 401) showLogin('La sesión dejó de estar autorizada. Iniciá sesión nuevamente.');

    if (!response.ok || !body || body.ok !== true || !Array.isArray(body.properties)) {
      const error = body && body.error ? String(body.error) : 'MANAGER_PROPERTIES_LOAD_FAILED';
      const e = new Error(error);
      e.code = error;
      throw e;
    }

    if (generation === authGeneration && readToken() === accessToken && !document.body.classList.contains('manager-auth-pending')) renderProperties(body.properties);
    return body.properties;
  }

  // Display an expired stay as expired even if its DB lifecycle has not
  // yet transitioned from scheduled/active. Never alter DB state in UI.
  function effectiveStayStatus(stay) {
    const status = String(stay?.status || '');
    const checkout = Date.parse(String(stay?.check_out_at || ''));
    if (['scheduled', 'active'].includes(status)
        && Number.isFinite(checkout) && checkout <= Date.now()) return 'expired';
    return status;
  }

  function stayStatusLabel(statusValue) {
    const labels = {
      draft: 'Borrador',
      scheduled: 'Programada',
      active: 'Activa',
      completed: 'Finalizada',
      expired: 'Vencida',
      cancelled: 'Cancelada',
      revoked: 'Revocada'
    };
    return labels[String(statusValue || '')] || String(statusValue || 'Sin estado');
  }

  function stayStatusClass(statusValue) {
    const value = String(statusValue || '');
    if (value === 'scheduled' || value === 'active' || value === 'completed') return 'tag';
    if (value === 'draft' || value === 'expired') return 'tag warn';
    return 'tag danger';
  }

  function formatStayDate(value) {
    if (!value) return '—';
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

  function renderStays(stays) {
    const list = document.querySelector('#estadias .list');
    if (!list) return;

    list.replaceChildren();

    if (!stays.length) {
      const empty = document.createElement('article');
      empty.className = 'card';
      const title = document.createElement('b');
      title.textContent = 'Sin estadías';
      const detail = document.createElement('p');
      detail.className = 'muted';
      detail.textContent = 'No hay estadías disponibles en las propiedades autorizadas.';
      empty.append(title, detail);
      list.appendChild(empty);
      return;
    }

    stays.forEach((stay) => {
      const row = document.createElement('article');
      row.className = 'row';
      const stayIdentifier = stay.id || stay.stay_id || '';
      row.dataset.stayId = String(stayIdentifier);
      row.dataset.stayStatus = String(effectiveStayStatus(stay));
      row.dataset.stayCheckout = String(stay.check_out_at || '');

      const identity = document.createElement('div');
      const name = document.createElement('b');
      name.textContent = String(stay.property_internal_name || 'Propiedad');
      const source = document.createElement('div');
      source.className = 'muted';
      source.textContent = 'Estadía registrada';
      identity.append(name, source);

      const dates = document.createElement('span');
      dates.textContent =
        formatStayDate(stay.check_in_at) + ' → ' + formatStayDate(stay.check_out_at);

      const statusTag = document.createElement('span');
      statusTag.className = stayStatusClass(effectiveStayStatus(stay));
      statusTag.textContent = stayStatusLabel(effectiveStayStatus(stay));

      const access = document.createElement('span');
      access.textContent =
        'Acceso: ' + formatStayDate(stay.access_from) + ' → ' + formatStayDate(stay.access_until);

      row.append(identity, dates, statusTag, access);
      list.appendChild(row);
    });
  }

  function renderStaysError() {
    if (document.body.classList.contains('manager-auth-pending')) return;
    const list = document.querySelector('#estadias .list');
    if (!list) return;
    list.replaceChildren();

    const errorCard = document.createElement('article');
    errorCard.className = 'card';
    const title = document.createElement('b');
    title.textContent = 'No pudimos cargar las estadías';
    const detail = document.createElement('p');
    detail.className = 'muted';
    detail.textContent = 'No pudimos comprobar esta sección. Volvé a verificar el acceso antes de continuar.';
    errorCard.append(title, detail);
    list.appendChild(errorCard);
  }

  async function loadManagerStays(accessToken) {
    const generation = authGeneration;
    const response = await fetchAuth(BACKEND_STAYS_URL, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
        redirect: 'error',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        Accept: 'application/json'
      }
    });

    let body = null;
    try { body = await response.json(); } catch (_) {}

    if (generation !== authGeneration || readToken() !== accessToken) return [];
    if (response.status === 401) showLogin('La sesión dejó de estar autorizada. Iniciá sesión nuevamente.');

    if (!response.ok || !body || body.ok !== true || !Array.isArray(body.stays)) {
      const error = body && body.error ? String(body.error) : 'MANAGER_STAYS_LOAD_FAILED';
      const e = new Error(error);
      e.code = error;
      throw e;
    }

    if (generation === authGeneration && readToken() === accessToken && !document.body.classList.contains('manager-auth-pending')) renderStays(body.stays);
    return body.stays;
  }

  async function verifyManagerSession(accessToken) {
    const response = await fetchAuth(BACKEND_SESSION_URL, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
        redirect: 'error',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        Accept: 'application/json'
      }
    });

    let body = null;
    try { body = await response.json(); } catch (_) {}

    if (!response.ok || !body || body.ok !== true || !body.session) {
      const error = body && body.error ? String(body.error) : 'MANAGER_SESSION_DENIED';
      const e = new Error(error);
      e.code = error;
      throw e;
    }

    const session = body.session;
    const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
    if (typeof session !== 'object' || Array.isArray(session) || Object.keys(session).sort().join('|') !== 'account_id|member_id|role' ||
        !uuid(session.account_id) || !uuid(session.member_id) || !['owner','manager','co_manager'].includes(session.role)) {
      const error = new Error('MANAGER_SESSION_RESPONSE_INVALID'); error.code = error.message; throw error;
    }
    // DTO compatibility only; permission/current-authority verification remains on the server.
    return session;
  }

  async function signIn(loginEmail, loginPassword) {
    const response = await fetchAuth(
      SUPABASE_URL + '/auth/v1/token?grant_type=password',
      {
        method: 'POST',
        cache: 'no-store',
        redirect: 'error',
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword
        })
      }
    );

    let body = null;
    try { body = await response.json(); } catch (_) {}

    if (!response.ok || !body || !body.access_token) {
      const code = response.status === 429 ? 'LOGIN_RATE_LIMITED' : [400,401].includes(response.status) ? 'LOGIN_INVALID' : 'LOGIN_UNCONFIRMED';
      const e = new Error(code);
      e.code = code;
      throw e;
    }

    return body.access_token;
  }

  forgot.addEventListener('click', () => toggleRecovery(true));
  recoveryCancel.addEventListener('click', () => toggleRecovery(false));
  recoveryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (recoveryPending || recoverySubmit.disabled) return;
    const recoveryAttempt = recoveryGeneration;
    const requestedEmail = recoveryEmail.value.trim();
    if (!recoveryEmail.checkValidity()) {
      recoveryMessage('Ingresá un correo válido.', 'error');
      return;
    }
    const redirect = "https://fictional-web.example.invalid/manager/reset-password/";
    recoveryPending = true;
    recoverySubmit.disabled = true;
    const controller = new AbortController();
    recoveryController = controller;
    recoveryMessage('Solicitando enlace de recuperación…');
    try {
      const response = await fetchAuth(
        SUPABASE_URL + '/auth/v1/recover?redirect_to=' + encodeURIComponent(redirect),
        {
          signal: controller.signal,
          method: 'POST',
          cache: 'no-store',
        redirect: 'error',
          referrerPolicy: 'no-referrer',
          headers: {
            apikey: SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({ email: requestedEmail })
        }
      );
      if (recoveryAttempt !== recoveryGeneration) return;
      if (response.status === 429) {
        recoveryMessage('Por seguridad se alcanzó el límite temporal de correos. Esperá antes de volver a solicitarlo.', 'error');
      } else if (!response.ok) {
        recoveryMessage('No se pudo solicitar el enlace en este momento. Intentá más tarde.', 'error');
      } else {
        recoveryMessage('Si el correo corresponde a un manager registrado, recibirás un enlace. Abrilo directamente en Chrome. Revisá también Spam.', 'ok');
      }
    } catch (_) {
      if (recoveryAttempt !== recoveryGeneration) return;
      recoveryMessage('No pudimos confirmar la solicitud. Evitá repetirla enseguida; revisá el correo antes de intentarlo más tarde.', 'error');
    } finally {
      if (recoveryAttempt === recoveryGeneration) { recoveryPending = false; recoveryController = null; recoverySubmit.disabled = false; }
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (signingOut || submit.disabled || !storageHealthy) return;
    const generation = ++authGeneration;
    submit.disabled = true;
    setStatus('Verificando acceso…');
    let accessToken = '';

    try {
      accessToken = await signIn(email.value.trim(), password.value);
      if (generation !== authGeneration) { await revokeSession(accessToken); return; }
      const managerSession = await verifyManagerSession(accessToken);
      if (generation !== authGeneration) { await revokeSession(accessToken); return; }
      storeToken(accessToken);
      password.value = '';
      setStatus('', '');
      showPanel(managerSession);
      loadManagerProperties(accessToken).catch(() => { if (generation === authGeneration) renderPropertiesError(); });
      loadManagerStays(accessToken).catch(() => { if (generation === authGeneration) renderStaysError(); });
    } catch (error) {
      await revokeSession(accessToken);
      if (generation !== authGeneration) return;
      if (!clearToken() || !storageHealthy) { showLogin(''); return; }

      if (error && error.code === 'LOGIN_INVALID') {
        setStatus('No pudimos validar el ingreso. Revisá el correo, la contraseña y el estado de tu cuenta.', 'error');
      } else if (error && error.code === 'LOGIN_RATE_LIMITED') {
        setStatus('Se alcanzó el límite temporal de intentos. Esperá antes de volver a ingresar.', 'error');
      } else if (error && error.code === 'WEB_IDENTITY_UNKNOWN') {
        setStatus('El usuario existe, pero todavía no está vinculado a un manager de Concierge.', 'error');
      } else if (error && error.code === 'MANAGER_MEMBER_NOT_ACTIVE') {
        setStatus('El acceso de este manager no está activo.', 'error');
      } else {
        setStatus('No se pudo validar el acceso. Revisaremos la conexión antes de continuar.', 'error');
      }
    } finally {
      if (generation === authGeneration && !signingOut) submit.disabled = !storageHealthy;
    }
  });

  logout.addEventListener('click', async () => {
    if (signingOut) return;
    const accessToken = readToken();
    signingOut = true;
    // Hide and clear the panel before any network operation. In-flight
    // admission/restore responses cannot reopen it after this generation.
    showLogin('');
    submit.disabled = true;
    try {
      const revoked = await revokeSession(accessToken);
      if (!storageHealthy) {
        setStatus('No pudimos limpiar la sesión local de esta pestaña. Cerrala antes de volver a ingresar; el cierre en el servicio no asegura la retirada inmediata de un JWT emitido.', 'error');
      } else if (!revoked) {
        setStatus('Saliste de este navegador. No pudimos confirmar el cierre de la sesión en el servicio.', 'error');
      }
    } finally {
      signingOut = false;
      submit.disabled = !storageHealthy;
    }
  });

  async function restoreSession() {
    const existingToken = readToken();
    if (!existingToken) {
      showLogin('');
      return;
    }

    setStatus('Restaurando sesión…');
    const generation = ++authGeneration;

    try {
      const managerSession = await verifyManagerSession(existingToken);
      if (generation !== authGeneration || readToken() !== existingToken) return;
      setStatus('', '');
      showPanel(managerSession);
      loadManagerProperties(existingToken).catch(() => { if (generation === authGeneration) renderPropertiesError(); });
      loadManagerStays(existingToken).catch(() => { if (generation === authGeneration) renderStaysError(); });
    } catch (_) {
      if (generation !== authGeneration) return;
      // A fetch failure, unreadable response or HELD 503 does not prove expiry.
      // Explicit current 401/403 responses are already handled by fetchAuth.
      showLogin('No pudimos comprobar tu sesión. El panel sigue cerrado por seguridad.');
    }
  }
  window.addEventListener('cheveni-manager-session-denied', () => {
    showLogin('La sesión dejó de estar autorizada. Iniciá sesión nuevamente.');
  });
  window.addEventListener('pagehide', () => {
    cancelRecovery(); recoveryEmail.value = ''; recoveryMessage('');
    authGeneration += 1;
    document.body.classList.add('manager-auth-pending');
    clearPanelData();
    authScreen.hidden = false;
    password.value = ''; concealManagerPassword();
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted && !signingOut) restoreSession();
  });
  restoreSession();
})();
