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
      row.dataset.stayStatus = String(stay.status || '');`;

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
  const BACKEND_INVITE_URL = 'https://chebot-backend-git-concierge-v3-design-chebot.vercel.app/api/concierge/manager/invites/send';
  const terminalStatuses = new Set(['completed', 'cancelled', 'revoked']);

  function errorCopy(code) {
    const messages = {
      INVITE_NOT_FOUND: 'No hay una invitación preparada para esta estadía.',
      INVITE_EXPIRED: 'La invitación preparada ya venció.',
      INVITE_NOT_SENDABLE: 'Esta invitación ya no se puede enviar.',
      STAY_NOT_INVITABLE: 'Esta estadía ya no admite invitaciones.',
      PRIMARY_GUEST_NOT_FOUND: 'No encontré al huésped principal de la estadía.',
      GUEST_NOT_NOTIFIABLE: 'El huésped no tiene WhatsApp habilitado.',
      WHATSAPP_CHANNEL_NOT_READY: 'El canal de WhatsApp todavía no está listo.',
      WHATSAPP_TEMPLATE_SEND_FAILED: 'Meta no aceptó el envío de la plantilla.',
      AUTH_TOKEN_INVALID: 'La sesión del manager venció.',
      MANAGER_ACCESS_DENIED: 'Tu cuenta no tiene permiso para enviar esta invitación.',
      INVITE_SEND_OWNER_ONLY_BETA: 'Durante la Beta esta acción está limitada al owner.'
    };
    return messages[String(code || '')] || 'No se pudo enviar la invitación. Reintentá después de revisar el estado.';
  }

  async function sendInvite(stayId, button, action) {
    const accessToken = sessionStorage.getItem(TOKEN_KEY);
    if (!accessToken) {
      action.replaceChildren();
      const message = document.createElement('span');
      message.className = 'manager-invite-error';
      message.textContent = 'La sesión venció. Volvé a iniciar sesión.';
      action.appendChild(message);
      return;
    }

    button.disabled = true;
    button.textContent = 'Enviando…';

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
      button.disabled = false;
      button.textContent = 'Enviar invitación';
      const message = document.createElement('span');
      message.className = 'manager-invite-error';
      message.textContent = 'No se pudo conectar con Chebot Backend.';
      action.replaceChildren(message);
      return;
    }

    if (!response.ok || !body || body.ok !== true) {
      button.disabled = false;
      button.textContent = 'Enviar invitación';
      const message = document.createElement('span');
      message.className = 'manager-invite-error';
      message.textContent = errorCopy(body && body.error);
      action.replaceChildren(message);
      return;
    }

    button.disabled = true;
    button.classList.add('is-sent');
    button.textContent = body.invite && body.invite.already_sent
      ? 'Invitación ya enviada'
      : 'Invitación enviada';
  }

  function installButtons() {
    const rows = document.querySelectorAll('#estadias .row[data-stay-id]');
    rows.forEach((row) => {
      if (row.dataset.inviteControlInstalled === '1') return;
      row.dataset.inviteControlInstalled = '1';

      const stayId = String(row.dataset.stayId || '').trim();
      const stayStatus = String(row.dataset.stayStatus || '').trim();
      if (!stayId || terminalStatuses.has(stayStatus)) return;

      const action = document.createElement('div');
      action.className = 'manager-invite-action';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'manager-invite-button';
      button.textContent = 'Enviar invitación';
      button.setAttribute('aria-label', 'Enviar invitación de Chebot Concierge');
      button.addEventListener('click', () => sendInvite(stayId, button, action));

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
