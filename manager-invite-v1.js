const config = require('./manager-build-config.cjs').managerBuildConfig();
const fs = require('fs');
const path = require('path');

const out = path.join(__dirname, 'dist');
const managerDir = path.join(out, 'manager');
const htmlFile = path.join(managerDir, 'index.html');
const authBrowserFile = path.join(managerDir, 'manager-auth.js');

if (!fs.existsSync(htmlFile)) {
  throw new Error('dist/manager/index.html was not generated before manager-invite-v1.js.');
}
if (!fs.existsSync(authBrowserFile)) {
  throw new Error('dist/manager/manager-auth.js was not generated before manager-invite-v1.js.');
}

let authJs = fs.readFileSync(authBrowserFile, 'utf8');
const stayRowBefore = `stays.forEach((stay) => {
      const row = document.createElement('article');
      row.className = 'row';`;
const stayRowAfter = `stays.forEach((stay) => {
      const row = document.createElement('article');
      row.className = 'row';
      const stayIdentifier = stay.id || stay.stay_id || '';
      row.dataset.stayId = String(stayIdentifier);
      row.dataset.stayStatus = String(effectiveStayStatus(stay));
      row.dataset.stayCheckout = String(stay.check_out_at || '');`;

if (!authJs.includes("const stayIdentifier = stay.id || stay.stay_id || '';")) {
  if (!authJs.includes(stayRowBefore)) {
    throw new Error('Could not find Manager Web stay renderer hook.');
  }
  authJs = authJs.replace(stayRowBefore, stayRowAfter);
  fs.writeFileSync(authBrowserFile, authJs);
}

const css = `
#estadias .row{grid-template-columns:1.35fr 1fr auto 1fr auto}
.manager-invite-action{display:flex;align-items:center;justify-content:flex-end;min-width:132px}
.manager-invite-button{border:1px solid #0f766e;background:#0f766e;color:#fff;border-radius:10px;padding:9px 11px;font:inherit;font-size:.82rem;font-weight:850;cursor:pointer;white-space:nowrap}
.manager-invite-button:hover{background:#115e59}
.manager-invite-button:disabled{cursor:default;opacity:.7}
.manager-invite-button.is-sent{background:#eaf4f2;color:#115e59;border-color:#b7d9d4}
.manager-invite-error{color:#8a3325;font-size:.76rem;line-height:1.25;max-width:170px}
@media(max-width:980px){#estadias .row{grid-template-columns:1fr 1fr}.manager-invite-action{justify-content:flex-start}}
@media(max-width:720px){#estadias .row{grid-template-columns:1fr}.manager-invite-action{justify-content:flex-start}}
`;
fs.writeFileSync(path.join(managerDir, 'manager-invite.css'), css);

const browserJs = `
(() => {
  'use strict';

  const TOKEN_KEY = 'chebot_manager_preview_access_token';
  const BACKEND_INVITE_URL = ${JSON.stringify(config.apiUrl('invites/send'))};
  const invitables = new Set(['scheduled', 'active']);
  const REVIEW_KEY = 'chebot_manager_invite_review_v1';
  let pageActive = true;
  let generation = 0;
  if (typeof window !== 'undefined') window.addEventListener('pagehide', () => { pageActive = false; generation += 1; });
  const readToken = () => { try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch (_) { return ''; } };
  const needsReview = (stayId) => { try { return sessionStorage.getItem(REVIEW_KEY + ':' + stayId) === '1'; } catch (_) { return true; } };
  function showReview(stayId, button, action) {
    try { sessionStorage.setItem(REVIEW_KEY + ':' + stayId, '1'); } catch (_) {}
    button.disabled = true;
    button.textContent = 'Resultado en revisión';
    const message = document.createElement('span');
    message.className = 'manager-invite-error';
    message.setAttribute('role', 'status');
    message.textContent = 'El envío pudo haberse procesado. No lo repitas hasta revisar el registro con soporte.';
    action.replaceChildren(button, message);
  }


  function errorCopy(code) {
    const messages = {
      INVITE_NOT_FOUND: 'No hay una invitación preparada para esta estadía.',
      INVITE_EXPIRED: 'La invitación preparada ya venció.',
      INVITE_NOT_SENDABLE: 'Esta invitación ya no se puede enviar.',
      STAY_NOT_INVITABLE: 'Esta estadía ya no admite invitaciones.',
      PRIMARY_GUEST_NOT_FOUND: 'No encontré al huésped principal de la estadía.',
      GUEST_NOT_NOTIFIABLE: 'El huésped no tiene WhatsApp habilitado.',
      WHATSAPP_CHANNEL_NOT_READY: 'El huésped debe iniciar el chat y aceptar su invitación para verificar el canal.',
      INVITE_PRIVACY_AUTHORITY_REQUIRED: 'El envío está pausado hasta verificar el aviso y la autorización del huésped.',
      INVITE_PRIVACY_AUTHORITY_UNAVAILABLE: 'No pude comprobar la autorización. El envío sigue pausado.',
      GUEST_INVITE_PRIVACY_HOLD: 'El envío está pausado mientras se completa la revisión de privacidad.',
      WHATSAPP_TEMPLATE_SEND_FAILED: 'Meta no aceptó el envío de la plantilla.',
      AUTH_TOKEN_INVALID: 'La sesión del manager venció.',
      MANAGER_ACCESS_DENIED: 'Tu cuenta no tiene permiso para enviar esta invitación.',
      INVITE_SEND_OWNER_ONLY_BETA: 'Durante la Beta esta acción está limitada al owner.'
    };
    return messages[String(code || '')] || 'No pude confirmar el envío. Revisá su estado con soporte antes de intentar otra acción.';
  }

  function knownPreDispatchDenial(status, code) {
    const codes = {
      400: ['INVALID_JSON','INVALID_BODY','INVITE_OR_STAY_ID_REQUIRED','INVITE_ID_INVALID'],
      401: ['AUTH_HEADER_REQUIRED','AUTH_TOKEN_INVALID'],
      403: ['CORS_ORIGIN_NOT_ALLOWED','MANAGER_ACCESS_DENIED','INVITE_SEND_OWNER_ONLY_BETA','INVITE_OUT_OF_SCOPE'],
      404: ['STAY_NOT_FOUND','INVITE_NOT_FOUND'],
      409: ['PRIMARY_GUEST_NOT_FOUND','INVITE_NOT_SENDABLE','INVITE_EXPIRY_UNVERIFIED','INVITE_EXPIRED','GUEST_NOT_NOTIFIABLE','GUEST_NAME_REQUIRED','STAY_NOT_INVITABLE','WHATSAPP_CHANNEL_NOT_READY','INVITE_TEMPLATE_DATA_INCOMPLETE'],
      503: ['INVITE_PRIVACY_AUTHORITY_REQUIRED','INVITE_PRIVACY_AUTHORITY_UNAVAILABLE','GUEST_INVITE_PRIVACY_HOLD']
    };
    return Boolean(codes[status] && codes[status].includes(code));
  }

  async function sendInvite(stayId, button, action, binding) {
    if (button.disabled || needsReview(stayId)) return;
    const current = () => pageActive && generation === binding.generation && readToken() === binding.token && Boolean(binding.token)
      && binding.row.isConnected !== false && binding.row.dataset.stayId === stayId
      && binding.row.dataset.stayStatus === binding.status && binding.row.dataset.stayCheckout === binding.checkout
      && invitables.has(binding.status) && Date.parse(binding.checkout) > Date.now()
      && !document.body?.classList?.contains('manager-auth-pending');
    if (!current()) {
      button.disabled = true;
      action.replaceChildren();
      const message = document.createElement('span');
      message.className = 'manager-invite-error';
      message.textContent = 'La sesión o la estadía cambió. Recargá y verificá el acceso antes de continuar.';
      action.appendChild(message);
      return;
    }
    const accessToken = binding.token;

    button.disabled = true;
    button.textContent = 'Enviando…';

    // Persist BEFORE POST: reload/navigation may destroy this JavaScript context
    // after the server accepted the request but before its receipt arrives.
    // This tab-local marker supplements, never replaces, the SQL reservation.
    try {
      sessionStorage.setItem(REVIEW_KEY + ':' + stayId, '1');
      if (sessionStorage.getItem(REVIEW_KEY + ':' + stayId) !== '1') throw new Error('INVITE_INTENT_NOT_PERSISTED');
    }
    catch (_) { showReview(stayId, button, action); return; }

    let response;
    let body = null;
    try {
      response = await fetch(BACKEND_INVITE_URL, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-store',
        headers: {
          Authorization: 'Bearer ' + accessToken,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ stay_id: stayId })
      });
      try { body = await response.json(); } catch (_) {}
    } catch (_) {
      showReview(stayId, button, action);
      return;
    }

    if (!current()) { showReview(stayId, button, action); return; }

    if (!body || body.reconciliation_required === true || body.accepted_by_provider === true ||
        response.status >= 500 && !['INVITE_PRIVACY_AUTHORITY_REQUIRED','INVITE_PRIVACY_AUTHORITY_UNAVAILABLE','GUEST_INVITE_PRIVACY_HOLD'].includes(body.error)) {
      showReview(stayId, button, action);
      return;
    }
    if (!response.ok || !body || body.ok !== true) {
      if (!knownPreDispatchDenial(response.status, body.error)) { showReview(stayId, button, action); return; }
      try { sessionStorage.removeItem(REVIEW_KEY + ':' + stayId); }
      catch (_) { showReview(stayId, button, action); return; }
      button.disabled = false;
      button.textContent = 'Enviar invitación';
      const message = document.createElement('span');
      message.className = 'manager-invite-error';
      message.textContent = errorCopy(body && body.error);
      action.replaceChildren(button, message);
      return;
    }

    if (!body.invite || !['sent','activated'].includes(body.invite.status) ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(body.invite.id || ''))) {
      showReview(stayId, button, action);
      return;
    }
    button.disabled = true;
    try { sessionStorage.removeItem(REVIEW_KEY + ':' + stayId); } catch (_) {}
    button.classList.add('is-sent');
    button.textContent = body.invite && body.invite.already_sent
      ? 'Invitación ya procesada'
      : 'Envío registrado';
  }

  function installButtons() {
    const rows = document.querySelectorAll('#estadias .row[data-stay-id]');
    rows.forEach((row) => {
      if (row.dataset.inviteControlInstalled === '1') return;
      row.dataset.inviteControlInstalled = '1';

      const stayId = String(row.dataset.stayId || '').trim();
      const stayStatus = String(row.dataset.stayStatus || '').trim();
      const checkout = Date.parse(String(row.dataset.stayCheckout || ''));
      if (!stayId || !invitables.has(stayStatus)
          || !Number.isFinite(checkout) || checkout <= Date.now()) return;

      const action = document.createElement('div');
      action.className = 'manager-invite-action';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'manager-invite-button';
      button.textContent = 'Enviar invitación';
      button.setAttribute('aria-label', 'Enviar invitación de Che Vení Concierge');
      const binding = {row, token: readToken(), generation, status: stayStatus, checkout: String(row.dataset.stayCheckout || '')};
      button.addEventListener('click', () => sendInvite(stayId, button, action, binding));
      if (needsReview(stayId)) { showReview(stayId, button, action); row.appendChild(action); return; }

      action.appendChild(button);
      row.appendChild(action);
    });
  }

  const staysList = document.querySelector('#estadias .list');
  if (!staysList) return;

  const observer = new MutationObserver(installButtons);
  observer.observe(staysList, { childList: true, subtree: true });
  installButtons();
})();
`;
fs.writeFileSync(path.join(managerDir, 'manager-invite.js'), browserJs);

let html = fs.readFileSync(htmlFile, 'utf8');
if (!html.includes('/manager/manager-invite.css')) {
  html = html.replace(
    '</head>',
    '  <link rel="stylesheet" href="/manager/manager-invite.css">\n</head>'
  );
}
if (!html.includes('/manager/manager-invite.js')) {
  html = html.replace(
    '</body>',
    '  <script src="/manager/manager-invite.js" defer></script>\n</body>'
  );
}
fs.writeFileSync(htmlFile, html);

console.log('Manager Web Invite V1.1 installed.');
