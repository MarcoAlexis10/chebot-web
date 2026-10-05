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
  `  const BACKEND_INCIDENTS_URL = "https://chebot-backend-git-concierge-v3-design-chebot.vercel.app/api/concierge/manager/incidents";
  const TOKEN_KEY = 'chebot_manager_preview_access_token';`,
  `  const BACKEND_INCIDENTS_URL = "https://chebot-backend-git-concierge-v3-design-chebot.vercel.app/api/concierge/manager/incidents";
  const BACKEND_INCIDENT_STATE_URL = "https://chebot-backend-git-concierge-v3-design-chebot.vercel.app/api/concierge/manager/incidents/state";
  const TOKEN_KEY = 'chebot_manager_preview_access_token';`,
  'incident state endpoint constant'
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
        protocolLabel.textContent = 'Chebot ya probó este protocolo aprobado:';

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
        learning_pending: [
          ['Generar propuesta', '__propose_learning__', ''],
          ['Cerrar', 'closed', 'Manager cerró la incidencia después de revisión de aprendizaje.']
        ]
      };

      const availableActions = actionMap[item.status] || [];

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

        button.addEventListener('click', async () => {
          let managerMessage = '';

          if (nextStatus === '__propose_learning__') {
            if (!window.confirm(
              'Chebot va a crear una propuesta de nueva versión usando la última indicación del manager que el huésped confirmó como efectiva.\n\nLa versión activa actual seguirá vigente hasta que apruebes la propuesta.\n\n¿Continuar?'
            )) return;

            const buttons = Array.from(controls.querySelectorAll('button'));
            buttons.forEach((itemButton) => { itemButton.disabled = true; });

            try {
              const accessToken = sessionStorage.getItem(TOKEN_KEY);
              if (!accessToken) throw new Error('AUTH_REQUIRED');

              const response = await fetch(BACKEND_INCIDENT_STATE_URL, {
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

              let body = null;
              try { body = await response.json(); } catch (_) {}

              if (!response.ok || !body || body.ok !== true || !body.learning || body.learning.ok !== true) {
                const code =
                  body && body.learning && body.learning.reason
                    ? String(body.learning.reason)
                    : body && body.error
                      ? String(body.error)
                      : 'LEARNING_PROPOSAL_FAILED';
                throw new Error(code);
              }

              window.location.reload();
              return;
            } catch (error) {
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
              '¿Qué querés que Chebot le indique al huésped?\\n\\n' +
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
              'Chebot va a enviar esta instrucción al huésped:\\n\\n' +
              managerMessage +
              '\\n\\n¿Confirmás el envío?'
            )) return;
          } else {
            if (!window.confirm('¿Confirmás "' + label + '" para esta incidencia?')) return;
          }

          const buttons = Array.from(controls.querySelectorAll('button'));
          buttons.forEach((itemButton) => { itemButton.disabled = true; });

          try {
            const accessToken = sessionStorage.getItem(TOKEN_KEY);
            if (!accessToken) throw new Error('AUTH_REQUIRED');

            const payload = {
              incident_id: item.id,
              new_status: nextStatus,
              event_summary: eventSummary
            };

            if (nextStatus === 'waiting_guest') {
              payload.manager_message = managerMessage;
            }

            const response = await fetch(BACKEND_INCIDENT_STATE_URL, {
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
              const code = body && body.error ? String(body.error) : 'INCIDENT_STATE_CHANGE_FAILED';
              throw new Error(code);
            }

            if (nextStatus === 'learning_pending') {
              if (body.learning && body.learning.ok === false) {
                window.alert(
                  'La incidencia pasó a Aprendizaje pendiente, pero Chebot no pudo crear la propuesta automáticamente. ' +
                  String(body.learning.reason || 'LEARNING_PROPOSAL_FAILED')
                );
              }
              window.location.reload();
              return;
            }

            const refreshed = await loadManagerIncidents(accessToken);
            renderIncidents(refreshed);
          } catch (error) {
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
