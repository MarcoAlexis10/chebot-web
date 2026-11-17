# Che Vení — selector de imagen Native17 para ASUS (QA)

**Fecha:** 2026-11-17  
**Estado:** PATCH_QA_PUBLICADO · TESTS_NUEVOS_NO_EJECUTADOS · BETA_V1_NO_GO  
**Rama independiente:** `qa/cheveni-native17-image-tag-fix-20261117`  
**Base inmutable:** `213e4369d9e003db575ed985b95a69ce6545736c` del cierre post-ASUS.

## Defecto concreto corregido

El paquete `qa/native17-post-asus-20261117-v1/lab/lab.py` utilizaba en
`inspect_local()` el selector Docker literal `postgres:17.11`. La ASUS
reportó mediante `docker image ls`, `docker image inspect` y `postgres
--version` que tiene **`postgres:17.11-bookworm`**, ID local
`sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826`
y ejecutable `postgres (PostgreSQL) 17.11 (Debian 17.11-1.pgdg12+2)`.

La referencia sin sufijo era una incompatibilidad reproducible de selección
en un caché que sólo tenga la etiqueta observada. **No era una falla de
PostgreSQL ni autorizaba `docker pull`.** El selector de sólo lectura ahora
utiliza `LOCAL_IMAGE_TAG = 'postgres:17.11-bookworm'`. Continúa validando ID
sha256, OS Linux, arquitectura amd64 y endpoint Unix local. No agrega alias
fallback, descargas ni comandos de infraestructura.

## Commits y alcance

- `a7b230438099a6bf8e90a17d3c240d1a0799ae7e` — corrección de etiqueta
  de imagen en `lab/lab.py`.
- `3e4f76931c8b6c6dc9d5cb95fbcd7b5dc1228879` — caso de regresión
  `checks/inspect_local_image_test.py` con respuestas Docker **ficticias**
  para identidad exacta, endpoint remoto, ausencia de imagen y arquitectura
  inesperada.

**No** se modificó ninguna fuente de producción, backend, qa-lab, migración
SQL, guard, runner Native17 o rama base. Commits con `[skip ci]`; no hay
workflows activados.

## Evidencia honesta

- Comparación textual exacta antes de publicar: una única ocurrencia de la
  selección equivocada en el punto de inspección y un reemplazo controlado.
- La rama fue creada desde el HEAD del cierre previamente verificado.
- Los nuevos tests Python quedaron **escritos, pero NOT_RUN**. No se ejecutó
  Docker, PostgreSQL, Bubblewrap, systemd, Python del checkout ni SQL en esta
  intervención. No declarar suite aprobada.
- Los resultados A57/A58/A59 son observaciones previas del propietario en
  la ASUS; no se reproducen ni se atribuyen a esta rama.
- La referencia de imagen y el ID local no acreditan por sí mismos
  procedencia, integridad independiente de capas o durabilidad.

## Próximo paso concreto (ASUS físicamente presente)

Con un checkout exacto de esta rama y sin ejecutores operativos:

```sh
python3 -B qa/native17-post-asus-20261117-v1/checks/inspect_local_image_test.py
python3 -B qa/native17-post-asus-20261117-v1/lab/lab.py --inspect-local
```

Primera línea: tests sin Docker real; segunda: **sólo inspección local**,
con Docker local existente y sin pull. Revisar el resultado, UID y el ID
real en esa máquina; si falla, detenerse y no añadir alias o descargar.

No ejecutar `--execute`: continúa HELD. No levantar PostgreSQL ni usar
SQL `DO NOT APPLY`. El laboratorio Native17 no está acreditado íntegramente.

## Bloqueos reales que no cambia este parche

Los diez puertos protegidos sin implementación, source/cut/floors/custodia,
RLS/roles, revisión D02-A, COMMIT independiente, revocaciones, Auth real y
A2 integral permanecen retenidos. N01–N12, BPF01–BPF04 y F01–F12 no
se ejecutaron. **Beta V1 continúa NO-GO.**

## Recuperación de evidencia A57 del chat

Se incorporó [A57-OWNER-COMMAND-REFERENCE.md](A57-OWNER-COMMAND-REFERENCE.md):
transcripción del comando **entregado al propietario en esta conversación** y salida
mostrada en capturas, no historial de shell exportado ni ejecución por Work.
Permite contrastar la receta retenida con el procedimiento realmente probado:
UID, montajes Debian, tamaños tmpfs, socket, fsync y carga de FD seccomp.
La nueva receta de Work **no es equivalente** a A57 y permanece HELD.
No se ejecutó ningún servicio ni SQL para incorporar esta referencia.
