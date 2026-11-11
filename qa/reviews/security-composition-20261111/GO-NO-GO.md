# Matriz de salida del candidato retenido

| Condición | Evidencia disponible | Estado |
| --- | --- | --- |
| Contrato privado y nuevo adaptador | Codec, SDK/autoridad existentes y dos puertos originales compuestos; 18 casos nuevos + regresión focal del guard | Verificado sólo con dobles offline |
| Holds legal y prelegal | Ambos originales antes de leer configuración/input; sin override | Cerrados, intactos |
| Compatibilidad del RPC histórico | Once operaciones sin intersección con create_stay CBF1; rechazo sin fallback | Falta composición por dominio, no abrir |
| Readback independiente | Distintos PIDs/configuración y ACKs validados por puerto; pérdida de ACK sin reenviar | Falta evidencia física y credencial readback-only |
| Auth/revocación/refresh | Contratos ficticios de autoridad actual y nueva sesión, sin firma JWT o proveedor real | No acreditado operativamente |
| Idempotencia/COMMIT/locks SQL | Unicidad local/Map y ACK modelado; no PostgreSQL | NO-GO nativo |
| Journal/custodia/witness | No firmas creadas; gateway real no recibe evidencia positiva fabricada | Dependencia pendiente |
| Snapshot tras reinicio/A2 | Ausencia conserva UNKNOWN; sin nueva persistencia personal | Falta custodia/retención y recuperación integral |
| Native17 | Fuentes y dependencias reutilizadas; sin roles, migraciones o motor | PRE-FLIGHT NO-GO |
| Chromium/CORS | No nuevos intentos; cuatro pruebas anteriores pendientes de laboratorio | BLOQUEADO |
| Piloto/operación | CABA, un manager, una propiedad, 30 días gratis sin cobro automático | Sin altas, comunicaciones o release |

Este candidato no permite deploy, SQL, conexiones, apertura de tráfico o GO por un resultado de fixture. Primero cerrar mappings y contratos concretos; después, bajo autorización separada, acreditar los límites físicos/administrados y las condiciones legales/operativas. No se consume ni se solicita esa autorización en este cierre offline.
