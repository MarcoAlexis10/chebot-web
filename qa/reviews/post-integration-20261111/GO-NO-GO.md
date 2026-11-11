# Condiciones del candidato integral

**Beta V1 NO-GO.** Candidato compatible sólo en el contrato HTTP retenido conocido; no es un release operativo validado.

| Condición | Evidencia nueva o recuperada | Decisión |
| --- | --- | --- |
| Frontend/backend: rutas y versiones | Backend `9beb837a…` sin cambios; URLs del frontend sin cambios. Se hereda la evidencia HTTP retenida anterior, no se repite | Compatibilidad HELD acotada; no activa |
| Feedback del panel ante verificación desconocida | Defecto reproducido, corrección publicada, tres regresiones VM nuevas y build | Cerrado en QA dentro de este alcance |
| Chromium aislado y CORS real | AF_UNIX EPERM en dos mapeos; arranque con sandbox falla; cuatro casos pendientes | BLOQUEADO |
| Admisión legal/privacidad | Guard original intacto; formulario legal retenido; sin aprobaciones fabricadas | HOLD obligatorio |
| Auth/revocación/refresh | Contratos existentes recuperados; custodio no conectado, Auth lab sintético, refresh no implementado en frontend | SIN ACREDITACIÓN OPERATIVA |
| Revocadores y operaciones concurrentes | Fences en borradores; cobertura de actores/proveedor no acreditada; sin PostgreSQL | NO-GO |
| Writer e idempotencia SQL | Backend usa RPC histórico; lab privado usa CBF1/otros puertos. No hay wiring equivalente | NO-GO; no fallback/DML general |
| Reconciliación | No hay ruta HTTP conectada en el router/gateway seleccionados; readback privado y COMMIT pendientes | UNKNOWN permanece retenido |
| Native17 | Cierre parcial recuperado, políticas y Auth no nativos, ejecución no autorizada | PRE-FLIGHT NO-GO |
| Recuperación A2 | Evidencia de fixture histórica recuperada; Auth/Vault/Storage/custodia/release exacto pendientes | A2 integral NO-GO |
| Destino y migraciones | Se conserva la limitación DEV del build y el inventario anterior; ningún bundle de instalación aprobado | No activable |
| Comercial/operación | Un manager fundador y una propiedad CABA, 30 días gratuitos sin cobro automático; Free separado | Sin altas, cobros o comunicaciones |

## Siguiente acción que puede cambiar la decisión

Obtener un laboratorio de navegador ya autorizado que permita IPC Unix y sandbox sin habilitar egress; aprobar primero el bootstrap y después ejecutar los cuatro casos pendientes. No utilizar el host actual sin aislamiento, no crear recursos, no usar ASUS o Actions para obtener un resultado.

En paralelo, el cierre dirigido de SECURITY-CONTRACTS.md define la composición concreta que falta entre backend y puertos privados, y ACCEPTANCE-REQUIREMENTS.json especifica la evidencia nativa/administrada que exigiría una autorización separada. Preparar el manifiesto no concede esa autorización. No repetir las suites 31/66/14/18/17 por rutina.
