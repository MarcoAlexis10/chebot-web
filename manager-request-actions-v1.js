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
        const renderedToken = readSectionToken(), renderedSequence = loadSequence;
        const currentView = () => renderedToken && readSectionToken() === renderedToken && renderedSequence === loadSequence &&
          !document.body.classList.contains('manager-auth-pending');
        const reviewBlocked = () => { try { return sessionStorage.getItem(reviewKey) === '1'; } catch (_) { return true; } };
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
              sessionStorage.setItem(reviewKey, '1');
              if (sessionStorage.getItem(reviewKey) !== '1') throw new Error('NOT_RECORDED');
              intentRecorded = true;
            } catch (_) { throw new Error('REQUEST_INTENT_UNAVAILABLE'); }
            requestStarted = true;
            const response = await fetchManager(BACKEND_REQUEST_DECISION_URL, {
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
            const refreshed = await loadManagerRequests(accessToken);
            if (actionSequence !== loadSequence || !currentView()) return;
            const matching = Array.isArray(refreshed) ? refreshed.filter(row => row.id === item.id) : [];
            if (matching.length !== 1 || matching[0].property_id !== item.property_id || matching[0].stay_id !== item.stay_id ||
                matching[0].status !== decisionValue) throw new Error('REQUEST_REFRESH_UNCONFIRMED');
            renderRequests(refreshed);
          } catch (error) {
            if (error && error.message === 'REQUEST_INTENT_UNAVAILABLE') {
              approve.disabled = true; reject.disabled = true;
              window.alert('No pude preparar la acción de forma segura. No se envió la decisión. Cerrá y volvé a abrir esta página antes de continuar.');
              return;
            }
            if (requestStarted && (!responseReceived || reconciliationRequired || decisionConfirmed)) {
              try { sessionStorage.setItem(reviewKey, '1'); } catch (_) {}
              approve.disabled = true; reject.disabled = true;
              window.alert(decisionConfirmed
                ? 'La decisión se registró, pero falta actualizar la vista. Recargá para revisar el estado; no la repitas.'
                : 'La decisión pudo haberse registrado. No la repitas hasta revisar el resultado con soporte.');
              return;
            }
            if (intentRecorded) {
              try {
                sessionStorage.removeItem(reviewKey);
                if (sessionStorage.getItem(reviewKey) !== null) throw new Error('INTENT_NOT_CLEARED');
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

      row.append(identity, timing, statusTag, decision);`,
  'request decision UI'
);

fs.writeFileSync(managerJsFile, js);
console.log('Manager Web Request Actions V1 installed.');
