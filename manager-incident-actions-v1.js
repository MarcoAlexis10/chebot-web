const config = require('./manager-build-config.cjs').managerBuildConfig();
const fs = require('fs');
const path = require('path');

const managerJsFile = path.join(__dirname, 'dist', 'manager', 'manager-incidents.js');

if (!fs.existsSync(managerJsFile)) {
  throw new Error('dist/manager/manager-incidents.js was not generated before Incident Actions V1.');
}

let js = fs.readFileSync(managerJsFile, 'utf8');

function replaceRequired(before, after, label) {
  if (!js.includes(before)) {
    throw new Error(`Incident Actions V1 could not find required block: ${label}`);
  }
  js = js.replace(before, after);
}

replaceRequired(
  `  const BACKEND_INCIDENTS_URL = ${JSON.stringify(config.apiUrl('incidents'))};
  const TOKEN_KEY = 'chebot_manager_preview_access_token';`,
  `  const BACKEND_INCIDENTS_URL = ${JSON.stringify(config.apiUrl('incidents'))};
  const BACKEND_INCIDENT_STATE_URL = ${JSON.stringify(config.apiUrl('incidents/state'))};
  const BACKEND_KNOWLEDGE_URL = ${JSON.stringify(config.apiUrl('knowledge'))};
  const TOKEN_KEY = 'chebot_manager_preview_access_token';`,
  'incident state and knowledge endpoint constants'
);

replaceRequired(
  `    return body.incidents;
  }`,
  `    const incidents = body.incidents;

    const needsLearningCheck = incidents.some((item) =>
      item && item.status === 'learning_pending' && item.applied_knowledge && item.applied_knowledge.knowledge_key
    );

    if (needsLearningCheck) {
      try {
        const knowledgeResponse = await fetchManager(BACKEND_KNOWLEDGE_URL, {
          method: 'GET',
          mode: 'cors',
          cache: 'no-store',
          headers: {
            Authorization: 'Bearer ' + accessToken,
            Accept: 'application/json'
          }
        });

        let knowledgeBody = null;
        try { knowledgeBody = await knowledgeResponse.json(); } catch (_) {}

        if (
          knowledgeResponse.ok &&
          knowledgeBody &&
          knowledgeBody.ok === true &&
          Array.isArray(knowledgeBody.knowledge)
        ) {
          incidents.forEach((incident) => {
            if (!incident || incident.status !== 'learning_pending' || !incident.applied_knowledge) return;
            const key = incident.applied_knowledge.knowledge_key;
            // A key/version count from another property or another incident is
            // not evidence that this incident already has a learning draft.
            const matches = knowledgeBody.knowledge.filter((item) =>
              item && item.category === 'incident_protocol' && item.knowledge_key === key &&
              item.scope_type === 'property' && item.scope && item.scope.type === 'property' &&
              item.scope.property_id === incident.property_id && item.version &&
              item.version.status === 'draft' && item.version.source_type === 'learned_from_incident' &&
              typeof item.version.change_summary === 'string' &&
              item.version.change_summary.startsWith('incident:' + incident.id + ' |')
            );
            incident.learning_proposal_already_created = matches.length === 1;
            if (matches.length === 1) {
              incident.learning_visible_item_id = matches[0].id;
              incident.learning_visible_version_id = matches[0].version.id;
            }
          });
        }
      } catch (_) {
        // Safe fallback: if knowledge cannot be checked, keep the idempotent
        // "Generar propuesta" action available rather than blocking recovery.
      }
    }

    return incidents;
  }`,
  'learning proposal state enrichment'
);

replaceRequired(
  `      const action = document.createElement('span');
      if (item.manager_intervention_required === true) {
        action.textContent = 'Requiere intervención del manager';
      } else if (item.guest_confirmed_resolved === true) {
        action.textContent = 'Resolución confirmada por huésped';
      } else if (item.resolution_summary) {
        action.textContent = text(item.resolution_summary, 'Resolución registrada');
      } else {
        action.textContent = 'Abierta: ' + text(formatDateTime(item.opened_at), '—');
      }

      row.append(identity, summary, statusTag, action);`,
  `      const action = document.createElement('div');
      action.style.display = 'grid';
      action.style.gap = '7px';

      const actionText = document.createElement('span');
      if (item.manager_intervention_required === true) {
        actionText.textContent = 'Requiere intervención del manager';
      } else if (item.guest_confirmed_resolved === true) {
        actionText.textContent = 'Resolución confirmada por huésped';
      } else if (item.resolution_summary) {
        actionText.textContent = text(item.resolution_summary, 'Resolución registrada');
      } else {
        actionText.textContent = 'Abierta: ' + text(formatDateTime(item.opened_at), '—');
      }
      action.appendChild(actionText);

      const showAppliedProtocol =
        item.applied_knowledge &&
        item.applied_knowledge.content &&
        ['new', 'waiting_manager', 'resolving', 'waiting_guest', 'escalated'].includes(item.status);

      if (showAppliedProtocol) {
        const protocolBox = document.createElement('div');
        protocolBox.style.marginTop = '2px';
        protocolBox.style.padding = '9px 10px';
        protocolBox.style.borderRadius = '9px';
        protocolBox.style.background = '#eef7f5';
        protocolBox.style.border = '1px solid #c9e2dd';
        protocolBox.style.fontSize = '0.92rem';
        protocolBox.style.lineHeight = '1.35';

        const protocolLabel = document.createElement('b');
        protocolLabel.textContent = 'Che Vení ya probó este protocolo aprobado:';

        const protocolText = document.createElement('div');
        protocolText.style.marginTop = '4px';
        protocolText.textContent = text(item.applied_knowledge.content, '—');

        const protocolMeta = document.createElement('div');
        protocolMeta.style.marginTop = '5px';
        protocolMeta.style.fontSize = '0.82rem';
        protocolMeta.style.opacity = '0.75';
        const version = item.applied_knowledge.version_number
          ? 'v' + item.applied_knowledge.version_number
          : 'versión aprobada';
        protocolMeta.textContent =
          text(item.applied_knowledge.knowledge_key, 'Protocolo de incidencia') +
          ' · ' +
          version;

        protocolBox.append(protocolLabel, protocolText, protocolMeta);
        action.appendChild(protocolBox);
      }

      const showLatestGuestResponse =
        item.latest_guest_response &&
        ['new', 'waiting_manager', 'resolving', 'waiting_guest', 'escalated'].includes(item.status);

      if (showLatestGuestResponse) {
        const guestReply = document.createElement('div');
        guestReply.style.marginTop = '2px';
        guestReply.style.padding = '9px 10px';
        guestReply.style.borderRadius = '9px';
        guestReply.style.background = '#fff8e8';
        guestReply.style.border = '1px solid #eadfbd';
        guestReply.style.fontSize = '0.92rem';
        guestReply.style.lineHeight = '1.35';

        const guestReplyLabel = document.createElement('b');
        guestReplyLabel.textContent = 'Última respuesta del huésped:';

        const guestReplyText = document.createElement('div');
        guestReplyText.style.marginTop = '4px';
        guestReplyText.textContent = text(item.latest_guest_response, '—');

        guestReply.append(guestReplyLabel, guestReplyText);
        action.appendChild(guestReply);
      }

      if (item.status === 'learning_pending' && item.learning_proposal_already_created === true) {
        const learningState = document.createElement('span');
        learningState.className = 'muted';
        learningState.style.fontSize = '0.84rem';
        learningState.textContent = 'Propuesta de aprendizaje ya generada.';
        action.appendChild(learningState);
      }

      const controls = document.createElement('div');
      controls.style.display = 'flex';
      controls.style.flexWrap = 'wrap';
      controls.style.gap = '6px';

      const actionMap = {
        new: [
          ['Tomar caso', 'resolving', 'Manager tomó la incidencia y comenzó la resolución.'],
          ['Escalar', 'escalated', 'Manager escaló la incidencia.']
        ],
        waiting_manager: [
          ['Tomar caso', 'resolving', 'Manager tomó la incidencia y comenzó la resolución.'],
          ['Escalar', 'escalated', 'Manager escaló la incidencia.']
        ],
        resolving: [
          ['Responder al huésped', 'waiting_guest', 'Manager envió una instrucción al huésped y espera su respuesta.'],
          ['Escalar', 'escalated', 'Manager escaló la incidencia durante la resolución.']
        ],
        waiting_guest: [
          ['Retomar', 'resolving', 'Manager retomó la resolución de la incidencia.'],
          ['Escalar', 'escalated', 'Manager escaló la incidencia mientras esperaba al huésped.']
        ],
        escalated: [
          ['Retomar', 'resolving', 'Manager retomó la incidencia escalada.']
        ],
        resolved: [
          ['Aprendizaje', 'learning_pending', 'Incidencia resuelta enviada a revisión de aprendizaje.'],
          ['Cerrar', 'closed', 'Manager cerró la incidencia resuelta.']
        ],
        learning_pending: item.learning_proposal_already_created === true
          ? [
              ['Cerrar', 'closed', 'Manager cerró la incidencia después de revisión de aprendizaje.']
            ]
          : [
              ['Generar propuesta', '__propose_learning__', ''],
              ['Cerrar', 'closed', 'Manager cerró la incidencia después de revisión de aprendizaje.']
            ]
      };

      const availableActions = actionMap[item.status] || [];
      const reviewKey = 'chebot_manager_incident_review_v1:' + item.id;
      const renderedToken = readSectionToken(), renderedSequence = loadSequence;
      let mutationInFlight = false;
      const reviewNotice = document.createElement('span');
      reviewNotice.className = 'muted';
      const reviewBlocked = () => { try { return sessionStorage.getItem(reviewKey) === '1'; } catch (_) { return true; } };
      const currentAttempt = token => token && token === renderedToken && readSectionToken() === token &&
        renderedSequence === loadSequence && !document.body.classList.contains('manager-auth-pending');
      const recordIntent = () => {
        try { sessionStorage.setItem(reviewKey, '1'); if (sessionStorage.getItem(reviewKey) !== '1') throw new Error('NOT_RECORDED'); }
        catch (_) { throw new Error('INCIDENT_INTENT_UNAVAILABLE'); }
      };
      const clearIntent = () => {
        sessionStorage.removeItem(reviewKey);
        if (sessionStorage.getItem(reviewKey) !== null) throw new Error('INTENT_NOT_CLEARED');
      };
      const freeze = message => {
        mutationInFlight = true;
        controls.querySelectorAll('button').forEach(control => { control.disabled = true; });
        reviewNotice.textContent = message; action.appendChild(reviewNotice);
      };
      const freezeForReview = () => {
        try { sessionStorage.setItem(reviewKey, '1'); } catch (_) {}
        freeze('Resultado en revisión. No repitas la acción; verificá el registro con soporte.');
      };
      const freezeBeforeDispatch = () => freeze('No pude preparar la acción de forma segura. No se envió. Cerrá y volvé a abrir esta página antes de continuar.');
      const knownPreDispatchDenial = (response, body) => {
        const code = body && (body.error || (body.learning && body.learning.reason));
        return [400,401,403,404,409].includes(response.status) && body && body.ok === false &&
          body.reconciliation_required !== true && (!body.learning || body.learning.reconciliation_required !== true) &&
          ['AUTH_HEADER_REQUIRED','AUTH_TOKEN_INVALID','MANAGER_ACCESS_DENIED','MANAGER_PERMISSION_DENIED','CORS_ORIGIN_NOT_ALLOWED','INCIDENT_ID_INVALID','INVALID_INCIDENT_STATUS','INVALID_INCIDENT_EVENT_SUMMARY','MANAGER_MESSAGE_REQUIRED','MANAGER_MESSAGE_TOO_LONG','RESOURCE_OUT_OF_SCOPE','INCIDENT_NOT_READY_FOR_LEARNING','NO_EXISTING_PROTOCOL_TO_VERSION','NO_MANAGER_RESOLUTION_TO_LEARN'].includes(code);
      };
      const receiptId = value => typeof value === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
      const validLearningReceipt = receipt => receipt && receipt.ok === true && receipt.status === 'draft_created' &&
        receiptId(receipt.knowledge_item_id) && receiptId(receipt.version_id) &&
        Number.isSafeInteger(receipt.version_number) && receipt.version_number > 0 && receipt.version_status === 'draft';
      const boundIncident = rows => Array.isArray(rows) ? rows.filter(row => row && row.id === item.id) : [];
      const confirmedLearning = (rows, receipt) => {
        const matches = boundIncident(rows), row = matches[0];
        return validLearningReceipt(receipt) && matches.length === 1 && row.property_id === item.property_id &&
          row.stay_id === item.stay_id && row.status === 'learning_pending' &&
          row.learning_proposal_already_created === true && row.learning_visible_item_id === receipt.knowledge_item_id &&
          row.learning_visible_version_id === receipt.version_id;
      };
      if (reviewBlocked()) freezeForReview();

      const makeButton = (label, nextStatus, eventSummary, danger = false) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.style.border = danger ? '1px solid #ead0ca' : '0';
        button.style.borderRadius = '9px';
        button.style.padding = '8px 10px';
        button.style.fontWeight = '850';
        button.style.cursor = 'pointer';
        button.style.background = danger ? '#fff' : '#0f766e';
        button.style.color = danger ? '#8a3325' : '#fff';
        button.disabled = reviewBlocked();

        button.addEventListener('click', async () => {
          if (button.disabled || mutationInFlight || reviewBlocked()) return;
          let requestStarted = false, responseReceived = false, mutationConfirmed = false, reconciliationRequired = false, intentRecorded = false;
          let managerMessage = '';

          if (nextStatus === '__propose_learning__') {
            if (!window.confirm(
              'Che Vení va a crear una propuesta de nueva versión usando la última indicación del manager que el huésped confirmó como efectiva.\\n\\nLa versión activa actual seguirá vigente hasta que apruebes la propuesta.\\n\\n¿Continuar?'
            )) return;

            const buttons = Array.from(controls.querySelectorAll('button'));
            mutationInFlight = true;
            buttons.forEach((itemButton) => { itemButton.disabled = true; });

            try {
              const accessToken = readSectionToken();
              if (!currentAttempt(accessToken)) throw new Error('AUTH_REQUIRED');

              recordIntent(); intentRecorded = true;
              requestStarted = true;
              const response = await fetchManager(BACKEND_INCIDENT_STATE_URL, {
                method: 'POST',
                mode: 'cors',
                cache: 'no-store',
                headers: {
                  Authorization: 'Bearer ' + accessToken,
                  'Content-Type': 'application/json',
                  Accept: 'application/json'
                },
                body: JSON.stringify({
                  incident_id: item.id,
                  action: 'propose_learning'
                })
              });

              responseReceived = true;
              let body = null;
              try { body = await response.json(); } catch (_) {}
              if (!currentAttempt(accessToken)) { reconciliationRequired = true; throw new Error('AUTH_REQUIRED'); }

              if (!response.ok || !body || body.ok !== true || body.reconciliation_required === true || !validLearningReceipt(body.learning)) {
                reconciliationRequired = !knownPreDispatchDenial(response, body);
                const code =
                  body && body.learning && body.learning.reason
                    ? String(body.learning.reason)
                    : body && body.error
                      ? String(body.error)
                      : 'LEARNING_PROPOSAL_FAILED';
                throw new Error(code);
              }

              mutationConfirmed = true;
              const refreshed = await loadManagerIncidents(accessToken);
              if (!currentAttempt(accessToken) || !confirmedLearning(refreshed, body.learning)) { freezeForReview(); return; }
              clearIntent();
              renderIncidents(refreshed);
              return;
            } catch (error) {
              if (error && error.message === 'INCIDENT_INTENT_UNAVAILABLE') { freezeBeforeDispatch(); return; }
              if (requestStarted && (!responseReceived || mutationConfirmed || reconciliationRequired)) { freezeForReview(); return; }
              if (intentRecorded) { try { clearIntent(); } catch (_) { freezeForReview(); return; } }
              mutationInFlight = false;
              buttons.forEach((itemButton) => { itemButton.disabled = false; });
              const code = error && error.message ? String(error.message) : 'Reintentá.';
              const friendly = {
                INCIDENT_NOT_READY_FOR_LEARNING: 'La incidencia no está lista para generar aprendizaje.',
                NO_EXISTING_PROTOCOL_TO_VERSION: 'No encontré un protocolo existente para crear una nueva versión.',
                NO_MANAGER_RESOLUTION_TO_LEARN: 'No encontré una indicación del manager confirmada como resolución.'
              }[code] || code;

              window.alert('No se pudo generar la propuesta de aprendizaje. ' + friendly);
              return;
            }
          }

          if (nextStatus === 'waiting_guest') {
            const answer = window.prompt(
              '¿Qué querés que Che Vení le indique al huésped?\\n\\n' +
              'Escribí una instrucción concreta. Ejemplo: "Apagá el aire, esperá 5 minutos y volvé a encenderlo. Si sigue sin enfriar, avisame."'
            );

            if (answer === null) return;

            managerMessage = String(answer).trim();

            if (!managerMessage) {
              window.alert('Escribí una instrucción antes de enviar la respuesta al huésped.');
              return;
            }

            if (managerMessage.length > 3000) {
              window.alert('La instrucción es demasiado larga. Máximo 3000 caracteres.');
              return;
            }

            if (!window.confirm(
              'Che Vení va a enviar esta instrucción al huésped:\\n\\n' +
              managerMessage +
              '\\n\\n¿Confirmás el envío?'
            )) return;
          } else {
            if (!window.confirm('¿Confirmás "' + label + '" para esta incidencia?')) return;
          }

          const buttons = Array.from(controls.querySelectorAll('button'));
          mutationInFlight = true;
          buttons.forEach((itemButton) => { itemButton.disabled = true; });

          try {
            const accessToken = readSectionToken();
            if (!currentAttempt(accessToken)) throw new Error('AUTH_REQUIRED');

            const payload = {
              incident_id: item.id,
              new_status: nextStatus,
              event_summary: eventSummary
            };

            if (nextStatus === 'waiting_guest') {
              payload.manager_message = managerMessage;
            }

            recordIntent(); intentRecorded = true;
              requestStarted = true;
            const response = await fetchManager(BACKEND_INCIDENT_STATE_URL, {
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
              if (!currentAttempt(accessToken)) { reconciliationRequired = true; throw new Error('AUTH_REQUIRED'); }

            if (!response.ok || !body || body.ok !== true || body.reconciliation_required === true) {
              reconciliationRequired = !knownPreDispatchDenial(response, body);
              const code = body && body.error ? String(body.error) : 'INCIDENT_STATE_CHANGE_FAILED';
              throw new Error(code);
            }
            if (!body.incident || body.incident.incident_id !== item.id || body.incident.resulting_status !== nextStatus) {
              reconciliationRequired = true;
              throw new Error('INCIDENT_STATE_RESPONSE_INVALID');
            }
            mutationConfirmed = true;
            // A recorded state change does not prove that an attempted WhatsApp
            // send was rejected. Preserve uncertain provider outcomes for review.
            const knownNotSent = ['crypto_not_configured','incident_lookup_failed','incident_not_waiting_guest','manager_response_event_failed','guest_not_notifiable','channel_unavailable','template_required','channel_decrypt_failed','notification_authority_required','WHATSAPP_CONFIGURATION_MISSING'];
            const notification = body.notification;
            if (nextStatus === 'waiting_guest') {
              const validNotification = notification && !Array.isArray(notification) && typeof notification.sent === 'boolean' &&
                notification.manager_response_recorded === true && notification.reconciliation_required !== true &&
                (notification.sent === true
                  ? notification.status === 'sent' && notification.guidance_recorded === true &&
                    typeof notification.communicated_at === 'string' && Number.isFinite(Date.parse(notification.communicated_at))
                  : knownNotSent.includes(notification.status));
              if (!validNotification) { freezeForReview(); return; }
            } else if (notification && (notification.reconciliation_required === true ||
                notification.sent !== true && !knownNotSent.includes(notification.status))) {
              freezeForReview(); return;
            }

            if (nextStatus === 'learning_pending' &&
                (!body.learning || body.learning.reconciliation_required === true)) { freezeForReview(); return; }
            const refreshed = await loadManagerIncidents(accessToken);
            if (!currentAttempt(accessToken)) { freezeForReview(); return; }
            const matches = boundIncident(refreshed), fresh = matches[0];
            if (matches.length !== 1 || fresh.property_id !== item.property_id || fresh.stay_id !== item.stay_id ||
                fresh.status !== nextStatus || (nextStatus === 'learning_pending' && body.learning.ok === true &&
                !confirmedLearning(refreshed, body.learning))) { freezeForReview(); return; }
            clearIntent();
            renderIncidents(refreshed);
            if (nextStatus === 'waiting_guest' && notification.sent === false) {
              window.alert('La indicación quedó registrada, pero no se envió al huésped. Revisá el canal con soporte antes de otra comunicación; no repitas el envío.');
            }
          } catch (error) {
            if (error && error.message === 'INCIDENT_INTENT_UNAVAILABLE') { freezeBeforeDispatch(); return; }
              if (requestStarted && (!responseReceived || mutationConfirmed || reconciliationRequired)) { freezeForReview(); return; }
              if (intentRecorded) { try { clearIntent(); } catch (_) { freezeForReview(); return; } }
            mutationInFlight = false;
            buttons.forEach((itemButton) => { itemButton.disabled = false; });
            const code = error && error.message ? String(error.message) : 'Reintentá.';
            const friendly = {
              MANAGER_MESSAGE_REQUIRED: 'Escribí una instrucción antes de responder al huésped.',
              MANAGER_MESSAGE_TOO_LONG: 'La instrucción supera el máximo permitido de 3000 caracteres.'
            }[code] || code;

            window.alert(
              'No se pudo actualizar la incidencia. ' + friendly
            );
          }
        });

        return button;
      };

      availableActions.forEach(([label, nextStatus, eventSummary]) => {
        controls.appendChild(
          makeButton(label, nextStatus, eventSummary, nextStatus === 'escalated' || nextStatus === 'closed')
        );
      });

      if (availableActions.length) {
        action.appendChild(controls);
      }

      row.append(identity, summary, statusTag, action);`,
  'incident action UI'
);

fs.writeFileSync(managerJsFile, js);
console.log('Manager Web Incident Actions V1 installed.');
