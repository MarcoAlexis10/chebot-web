# Próxima sesión ASUS: revisión breve, todavía sin ejecución Native17

Este documento prepara una sesión posterior; no concede autorización. No volver
a ejecutar A01–A59 ni usar el directorio temporal anterior.

1. Con el propietario presente y autorización específica, revisar el checkout
   exacto y ejecutar sólo `review.py` y `compare_lab.py` como se indica en README.
   Esperar STOP_BEFORE_ANY_MUTATION y HELD_RECIPES_NOT_EQUIVALENT.
2. Si se autoriza únicamente inspección local, el comando ya existente
   `python3 -B qa/native17-post-asus-20261117-v1/lab/lab.py --inspect-local`
   lee contexto Docker Unix, metadatos de la imagen local y versiones; no pull,
   create/run, servicio ni PostgreSQL. Contrastar `postgres:17.11-bookworm`,
   OS Linux/amd64 e ID observado. Un ID actual distinto o una inspección fallida
   detienen la revisión; no añadir alias ni descargar. El ID informado antes
   fue `sha256:3645570cccdfa447589da9f57dd740faa29b30938e861289a5574b6ca6b03826`.
3. Revisar únicamente las siete diferencias calculadas en A57-COMPARISON.json:
   tasks32/64, scope/service y FD, UID/mapeo, montajes, socket/puerto, fsync/tmpfs,
   nuevos flags/límites. No tratar la receta nueva como acreditada por A57=0.
   No iniciar `fd_entry`, `inside-smoke.sh`, `--execute` ni el A57 histórico.
4. Decidir las observaciones mínimas faltantes para una futura receta exacta:
   binarios/bibliotecas y su procedencia, mapeo/peer identity, límites efectivos,
   montajes y cuota del staging. La sesión anterior no acredita estas variantes.

Componentes que ya pueden revisarse **como archivos**: selector de imagen,
comparador de referencia, inventario/lock del paquete, siete fragmentos SQL
retenidos, ABI reader26/writer11, diez contratos de puertos, doce relaciones de
la FK histórica, fases, roles y permisos propuestos. Ninguno necesita SQL.

Todavía no hay componente protegido de primera propiedad listo para instalar.
Antes de pedir ejecución nativa deben existir las fuentes/custodios reales,
decisiones específicas de conservación y un artefacto separado sellado por hash.
La D02-A histórica sobre conversaciones no autoriza por sí sola una nueva
copia permanente del original de dirección/unidad.

| Casos existentes | Dependencias que siguen reteniendo su rama |
|---|---|
| N01 | Catálogo exacto de roles, schemas, tipos, funciones, ACL/RLS/FK y conexiones separadas. Un inventario parcial del host no aprueba el caso. |
| BPF01; N02/N05/N10 | Fuente actual property_create pre-propiedad, fundador global, CABA vinculada al original, floors y catálogo completos. |
| BPF02; N03/N04/N06/N07; F07 | Admisión retenida, originales e historia independientes, writer histórico, todos los revocadores y conexiones/barreras observadas. |
| BPF03; N11 | LOGIN reader separado, metadata custodian/comparación privada, USAGE/EXECUTE/ACL/RLS efectivos; sin recibo bootstrap como readback. |
| BPF04; N08/N09 | COMMIT externo, original recuperable y comparación exacta, época/floors actuales, journal/witness. Pérdida de ACK mantiene UNKNOWN. |
| N12; F12 | Catálogo/revocadores y floors después de restauración; custodios independientes y autorización específica. A2 no se activa. |
| F01–F06/F08–F11 | Conservar tarjetas y objetivos originales del qa-lab. Requieren su dominio/fuentes/roles/barreras aprobados; no se relabelan como pruebas de propiedad. F10 sigue siendo invitación/handoff. |

Para cualquier caso futuro: acreditar que se alcanzó la rama protegida.
Guard exterior, función/tabla ausente, permiso denegado antes de la rama o timeout
son TARGET_NOT_REACHED, sin PASS nativo. ACK y function_returned no prueban COMMIT.
Sin evidencia correlacionada: UNKNOWN, cero redispatch y sin limpieza automática.

CABA: un manager fundador y una propiedad. Trial de 30 días desde la primera
estadía real verificada, sin cobro/conversión automáticos. Beta V1 NO-GO.
