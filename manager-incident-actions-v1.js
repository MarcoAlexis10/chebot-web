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
          ['Esperar huésped', 'waiting_guest', 'Manager completó su intervención y espera confirmación o respuesta del huésped.'],
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
          if (!window.confirm('¿Confirmás "' + label + '" para esta incidencia?')) return;

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
                new_status: nextStatus,
                event_summary: eventSummary
              })
            });

            let body = null;
            try { body = await response.json(); } catch (_) {}

            if (!response.ok || !body || body.ok !== true) {
              const code = body && body.error ? String(body.error) : 'INCIDENT_STATE_CHANGE_FAILED';
              throw new Error(code);
            }

            const refreshed = await loadManagerIncidents(accessToken);
            renderIncidents(refreshed);
          } catch (error) {
            buttons.forEach((itemButton) => { itemButton.disabled = false; });
            window.alert(
              'No se pudo actualizar la incidencia. ' +
              (error && error.message ? String(error.message) : 'Reintentá.')
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
