const fs = require('fs');
const path = require('path');

const managerJsFile = path.join(__dirname, 'dist', 'manager', 'manager-requests.js');

if (!fs.existsSync(managerJsFile)) {
  throw new Error('dist/manager/manager-requests.js was not generated before Request Actions V1.');
}

let js = fs.readFileSync(managerJsFile, 'utf8');

function replaceRequired(before, after, label) {
  if (!js.includes(before)) {
    throw new Error(`Request Actions V1 could not find required block: ${label}`);
  }
  js = js.replace(before, after);
}

replaceRequired(
  `  const BACKEND_REQUESTS_URL = "https://chebot-backend-git-concierge-v3-design-chebot.vercel.app/api/concierge/manager/requests";
  const TOKEN_KEY = 'chebot_manager_preview_access_token';`,
  `  const BACKEND_REQUESTS_URL = "https://chebot-backend-git-concierge-v3-design-chebot.vercel.app/api/concierge/manager/requests";
  const BACKEND_REQUEST_DECISION_URL = "https://chebot-backend-git-concierge-v3-design-chebot.vercel.app/api/concierge/manager/requests/decision";
  const TOKEN_KEY = 'chebot_manager_preview_access_token';`,
  'decision endpoint constant'
);

replaceRequired(
  `      const decision = document.createElement('span');
      if (item.status === 'new' || item.status === 'waiting_manager') {
        decision.textContent = 'Chebot espera tu decisión';
      } else if (item.decision_at) {
        decision.textContent = 'Decidida: ' + text(formatDateTime(item.decision_at), '—');
      } else {
        decision.textContent = 'Solicitud registrada';
      }

      row.append(identity, timing, statusTag, decision);`,
  `      const decision = document.createElement('div');

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

        const runDecision = async (decisionValue) => {
          const verb = decisionValue === 'approved' ? 'aprobar' : 'rechazar';
          if (!window.confirm('¿Confirmás ' + verb + ' esta solicitud?')) return;

          approve.disabled = true;
          reject.disabled = true;

          try {
            const accessToken = sessionStorage.getItem(TOKEN_KEY);
            if (!accessToken) {
              throw new Error('AUTH_REQUIRED');
            }

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

            const response = await fetch(BACKEND_REQUEST_DECISION_URL, {
              method: 'POST',
              mode: 'cors',
              cache: 'no-store',
              headers: {
                Authorization: 'Bearer ' + accessToken,
                'Content-Type': 'application/json',
                Accept: 'application/json'
              },
              body: JSON.stringify(payload)
            });

            let body = null;
            try { body = await response.json(); } catch (_) {}

            if (!response.ok || !body || body.ok !== true) {
              const code = body && body.error ? String(body.error) : 'REQUEST_DECISION_FAILED';
              throw new Error(code);
            }

            const refreshed = await loadManagerRequests(accessToken);
            if (sessionStorage.getItem(TOKEN_KEY) !== accessToken || document.body.classList.contains('manager-auth-pending')) return;
            renderRequests(refreshed);
          } catch (error) {
            approve.disabled = false;
            reject.disabled = false;
            window.alert(
              'No se pudo registrar la decisión. ' +
              (error && error.message ? String(error.message) : 'Reintentá.')
            );
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

      row.append(identity, timing, statusTag, decision);`,
  'request decision UI'
);

fs.writeFileSync(managerJsFile, js);
console.log('Manager Web Request Actions V1 installed.');
