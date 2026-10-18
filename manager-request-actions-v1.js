const config = require('./manager-build-config.cjs').managerBuildConfig();
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
  `  const BACKEND_REQUESTS_URL = ${JSON.stringify(config.apiUrl('requests'))};
  const TOKEN_KEY = 'chebot_manager_preview_access_token';`,
  `  const BACKEND_REQUESTS_URL = ${JSON.stringify(config.apiUrl('requests'))};
  const BACKEND_REQUEST_DECISION_URL = ${JSON.stringify(config.apiUrl('requests/decision'))};
  const TOKEN_KEY = 'chebot_manager_preview_access_token';`,
  'decision endpoint constant'
);

replaceRequired(
  `      const decision = document.createElement('span');
      if (item.status === 'new' || item.status === 'waiting_manager') {
        decision.textContent = 'Che Vení espera tu decisión';
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

        const reviewKey = 'chebot_manager_request_review_v1:' + item.id;
        if (sessionStorage.getItem(reviewKey) === '1') {
          approve.disabled = true; reject.disabled = true;
          const review = document.createElement('span');
          review.textContent = 'Resultado en revisión. No repitas la decisión; verificá el registro con soporte.';
          decision.appendChild(review);
        }
        const runDecision = async (decisionValue) => {
          if (approve.disabled || reject.disabled || sessionStorage.getItem(reviewKey) === '1') return;
          let requestStarted = false;
          let responseReceived = false;
          let decisionConfirmed = false;
          let reconciliationRequired = false;
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

            requestStarted = true;
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

            responseReceived = true;
            let body = null;
            try { body = await response.json(); } catch (_) {}

            if (!response.ok || !body || body.ok !== true) {
              reconciliationRequired = !body || body.reconciliation_required === true || body.error === 'REQUEST_NOT_PENDING' || response.status >= 500;
              const code = body && body.error ? String(body.error) : 'REQUEST_DECISION_FAILED';
              throw new Error(code);
            }

            if (!body.decision || body.decision.request_id !== item.id ||
                !['approved','rejected'].includes(body.decision.resulting_status)) {
              reconciliationRequired = true;
              throw new Error('REQUEST_DECISION_RESPONSE_INVALID');
            }
            decisionConfirmed = true;
            const refreshed = await loadManagerRequests(accessToken);
            if (sessionStorage.getItem(TOKEN_KEY) !== accessToken || document.body.classList.contains('manager-auth-pending')) return;
            renderRequests(refreshed);
          } catch (error) {
            if (requestStarted && (!responseReceived || reconciliationRequired || decisionConfirmed)) {
              sessionStorage.setItem(reviewKey, '1');
              approve.disabled = true; reject.disabled = true;
              window.alert(decisionConfirmed
                ? 'La decisión se registró, pero falta actualizar la vista. Recargá para revisar el estado; no la repitas.'
                : 'La decisión pudo haberse registrado. No la repitas hasta revisar el resultado con soporte.');
              return;
            }
            approve.disabled = false;
            reject.disabled = false;
            const explanations = {
              AUTH_REQUIRED: 'La sesión venció. Volvé a iniciar sesión.',
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

      row.append(identity, timing, statusTag, decision);`,
  'request decision UI'
);

fs.writeFileSync(managerJsFile, js);
console.log('Manager Web Request Actions V1 installed.');
