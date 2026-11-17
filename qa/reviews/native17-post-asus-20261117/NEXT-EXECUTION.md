# Recuperación y próxima ejecución

Código/evidencia sellados: `6b57e0027cbcbc1f1d2a6ccf4b59cd14e47bcf94`.
Rama web: `qa/cheveni-integral-held-20261111`. Verificar HEAD remoto y conservar
cualquier avance antes de escribir. Backend y qa-lab siguen sólo lectura.

1. Leer CLOSURE, TEST-EVIDENCE y PACKAGE-MANIFEST de este directorio. Recuperar
   el paquete `qa/native17-post-asus-20261117-v1/` y sus fuentes fijadas. El
   manifiesto contiene SHA256 y blobs; las 25 fuentes seleccionadas ya se
   compararon. No repetir pruebas sin un cambio concreto.
2. La ASUS tiene un smoke reportado por el propietario, no una nueva
   acreditación de Native17. No reinvestigar Work como host sustituto. Recuperar
   del chat original el comando A57 literal y observar localmente image ID,
   binarios/bibliotecas y UID cuando el propietario vuelva a usarla. La búsqueda
   de continuidad no devolvió el bloque literal; no reconstruirlo como observado.
3. Revisar la receta propuesta frente a esas observaciones: límites, mapeo de
   UID, flags bwrap, montajes, filtro, apertura de FD dentro de systemd, cuotas,
   parada y postflight. No usar el directorio temporal antiguo. La importación
   estricta puede rechazar symlinks/tipos de una imagen legítima: sin relajación
   automática. No editar guards para conseguir un resultado.
4. Antes de SQL, cerrar las diez funciones protegidas y el catálogo transitivo
   enumerados en MATERIALIZATION.json. Prioridad técnica: contrato verificable
   del productor actual de identidad/revisiones/floors y custodia del original,
   sin valores positivos constantes. El tipo del original no es su productor.
5. Sólo con fuentes/procedencias y decisiones disponibles preparar una
   materialización separada y sellada por hash, con roles/grants/RLS/revocadores
   completos. Los SQL actuales permanecen DO NOT APPLY. Para BPF03 no reutilizar
   el recibo bootstrap ni el principal writer como reader.
6. Solicitar en esa instancia autorización específica del host, artefacto,
   límites, datos sintéticos, casos existentes seleccionados y descarte. Este
   documento no la concede. Primero catálogo N01 y alcance de rama; luego
   BPF01/BPF02/N03/N06/F07 según dependencias. Pérdida de ACK: N08/BPF04;
   privilegios: N11/BPF03. F10 y F12 no cambian de dominio ni de autorización.

No iniciar todavía servicios, SQL, Auth, trial, invitaciones ni pruebas físicas.
El smoke tmpfs no acredita COMMIT durable ni A2. Sin originales/custodios/floors
actuales, conservar UNKNOWN y cero redispatch. Beta V1 NO-GO.
