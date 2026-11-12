# Continuación desde bootstrap, sin repetir trabajo

Leer CLOSURE y TEST-EVIDENCE; comparar HEAD remoto antes de escribir. Recuperar property-bootstrap-20261112-v1 con los paquetes previos que importa. El último manifiesto fija los bytes; no ejecutar build o scripts operativos.

## Prioridad técnica

1. Implementar bajo revisión una fuente protegida real de bootstrap, no un callback positivo: proveedor/sesión actuales, relación owner/member/account, asignación única de fundador, cupo con inventario completo bajo RLS, CABA acreditada y revisiones/floors con procedencia. bootstrap_relation_facts_review_v1 sólo prepara hechos; sus dos guards siguen y no reemplaza private_mutation_authority_v1 vacío.
2. Definir la admisión durable que liga request/intent/attempt/originalRef/key/revisiones al writer original de once argumentos. Sin ella, no perder campos ni despachar. Tras ACK perdido o reinicio sin original, UNKNOWN; no reconstruir desde cliente/key/digest.
3. Completar el resolver privado del original y el entry read/2 existente. No agregar otro ABI de 26 parámetros. Debe resolver cuenta por original/result/member/slot: no existe p_account. Inventario/fundador/cupo/jurisdicción suplementarios y key requieren productores; no salen de GET/updated_at. Mantener reader sin escritura, context RLS y ACL transitivas sin grants generales.
4. Resolver la custodia específica D02-A. CBF1 actual sólo admite intent create_stay y el verificador de invitación es select false. No reinterpretar property_create ni llenar huéspedes falsos. Conservar copia hasta aprobar un comparador del original exacto; no introducir protocolo firmado o almacenamiento privado por conveniencia.

## Transición al laboratorio

ASUS-PREFLIGHT anterior y sus 25 consultas se conservaron por hash, sin rehacer o ejecutar. Seguirlo físicamente en ASUS, un comando y revisión por vez, cuando corresponda. Este lote no autoriza acceso al equipo, iniciar servicios/WSL detenido, descargas, PostgreSQL, contenedores, SQL o N01–N12.

[NATIVE-DELTA.json](NATIVE-DELTA.json) prepara cuatro aserciones específicas BPF01–BPF04, todas NOT_AUTHORIZED/NOT_RUN. No reemplaza N01–N12 ni crea runner/instalador. Hace falta host gratuito acreditado y aprobación exacta de binario 17.11, fuentes/productores/roles/floors/custodia, materialización SHA, alcance, límites/ventana y descarte dirigido. No alcanza eliminar un aborto o observar un rechazo genérico: debe alcanzarse la rama del contrato bajo una materialización autorizada. Auth sintético local no acredita Auth administrado.

## Reproducción focal si hay cambios afectados

Desde el padre de web/backend:

```sh
python web/qa/integral-held-v1/run-isolated.py -- python web/qa/property-bootstrap-20261112-v1/verify-artifacts.py
python web/qa/integral-held-v1/run-isolated.py -- node --test --test-reporter=tap web/qa/property-bootstrap-20261112-v1/bootstrap.test.mjs
python web/qa/integral-held-v1/run-isolated.py -- node --test --test-reporter=tap web/qa/property-bootstrap-20261112-v1/read-binding.test.mjs
python web/qa/integral-held-v1/run-isolated.py -- node --test --test-reporter=tap web/qa/property-bootstrap-20261112-v1/view.test.mjs
```

Comandos de reproducción, no ejecuciones adicionales de este cierre. Custody/integration nuevos también tienen comandos efectivos en TEST-EVIDENCE; no repetir las 6/10/20/19 suites anteriores o casos históricos. read-fixtures extrae sólo la función sintética reading del archivo anterior: no importa/ejecuta sus tests. Los dos overlays HTML son un delta del root QA base, no sitio independiente; no desplegar o iniciar servidor.

El view-epoch es una barrera de presentación en Node: no Auth ni reserva durable. Un objeto nuevo en HELD no demuestra NEW/no efecto; recover permanece UNKNOWN. La UI continúa inerte, no conectada a eventos operativos.
