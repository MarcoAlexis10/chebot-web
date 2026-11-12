# Recorrido único QA retenido

El paquete extiende la cadena de once generadores original → compositor fundador → compositor de propiedad/estadía anterior → compose.cjs nocturno → materialize.mjs. No reimplementa login, SDK o gateway. Genera 18 archivos sólo en qa/functional-night-20261112-v1/generated/. El build operativo no se toca.

| Paso / destino | Código reutilizado y cambio | Qué está comprobado |
|---|---|---|
| Invitación /manager/activar/ | manager-signup-v1.js; guard legal anterior intacto | HTML inerte; enlaces legales ausentes se reemplazan por publicación retenida, sin crear texto legal |
| Login/sesión /manager/ | manager-auth-v1.js con patches QA previos + dos correcciones nocturnas | Script completo ejecutado en VM/DOM mínimo: 403 distingue permisos, logout limpia etiquetas/filas; tres regresiones previas 401/503/red |
| Propiedad /manager/propiedad/ | Formularios mínimos anteriores + tabla de siete operaciones | Propuestas versionadas/validadas Node, no alta o permiso real |
| Estadía /manager/planificar-estadia/ | Fechas locales anteriores + tabla de siete comandos | Revisión/inventario y calendario, no exclusión SQL o reserva real |
| Pre-arrival /manager/prearrival/ | Plantilla global anterior + contrato de proyección mínima | Sin texto privado; productor específico sigue ausente |
| Huésped /manager/#estadias | Invitación original retenida | No envío, registro o asociación real; script de invitación sin cambios |
| Solicitudes /manager/#solicitudes | Generador original; proyección mínima de estados QA | Relación cuenta/propiedad/estadía; decisiones permanecen HELD |
| Incidencias /manager/#incidencias | Generador original y createHeldIncidentAuthorityCandidate existente | Se invoca sólo frontera HELD; no se reconstruye gateway, CurrentResolution o SQL |
| Checkout /manager/planificar-estadia/#checkout | Frontera de lifecycle + secuenciador de revisión | Sin revocación real; respuestas tras checkout se descartan en modelo |
| Índice /manager/recorrido/ | Índice de esos mismos destinos | Todos los href/src locales y anchors resueltos por Node; sin navegador |

## Dos correcciones del script original generado

Un 403 current antes usaba la frase de sesión desautorizada; ahora explica rechazo de permisos, conserva cierre de acceso y no diagnostica expiración o revocación. Un 401 conserva mensaje anterior. 429 sigue limitado sin reintento; 503/fetch ilegible siguen sin afirmar expiración, CORS o rollback. No se relaja ningún guard.

clearPanelData antes limpiaba filas pero dejaba los rótulos de ámbito/sesión; el patch los elimina en logout/denegación/pagehide antes de await. El resultado de logout remoto puede seguir sin confirmar. Los marcadores de invitación incierta no se borran para permitir reenvío. auth-before.tap contiene dos FAIL del candidato anterior; auth-first.tap PASS y restore-regression.tap tres PASS previos afectados. No hay Auth positivo administrado ni JWT verificado ficticiamente.

## Respuestas tardías y casos funcionales

view-lease.mjs adapta el patrón authGeneration para revisiones QA: ticket efímero por canal, generación/sesión/cuenta/propiedad/estadía/revisiones, orden de solicitudes, expiración y checkout. Un ticket consumido no se reutiliza; cambio de ámbito o logout descarta respuestas. Se corrigió un retroceso de reloj en el modelo y se conserva fuente/log anterior. Sólo habilita estado público de revisión; privateViewAllowed=false siempre. No está conectado a una vista privada ni prueba una carrera nativa.

work-items.mjs acepta únicamente relaciones/status/revisión mínimos, sin summary/eventos/PII; el ámbito equivocado cierra toda la proyección. waiting_guest indica espera, learning_pending con confirmación del huésped permite sólo revisar una propuesta; automaticActivationAllowed=false. No se habilitan las once mutaciones históricas. Requests mantienen decisiones pendientes sin efecto automático sobre ventanas.

Todos los formularios están en blanco, inert y disabled, con CSP connect-src/form-action none. El nuevo materializador elimina favicon ausente y no presenta documentos legales no generados como publicaciones. Nueve assets JS/CSS anteriores son idénticos; sólo el Auth generado cambia. No servicios, browser, SQL o HTTP local. Este recorrido es inspeccionable como artefacto QA, no end-to-end operativo.
