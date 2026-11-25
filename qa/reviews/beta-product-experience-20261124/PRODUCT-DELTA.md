# Cambios del producto QA · 24/11/2026

Se amplió la composición existente `qa/pilot-integration-20261112-v1/`, basada en
property-bootstrap/first-property y en los generadores originales. Siguen siendo
18 archivos compuestos, ocho páginas HTML; no hay otra aplicación, panel o demo ASUS.
No se modificaron generadores raíz, build operativo ni backend.

| Área | Problema observado | Cambio implementado / límite |
|---|---|---|
| Incorporación | Recorrido retenido escrito para ingeniería, sin explicar los siguientes pasos del manager | La ruta existente recorrido explica invitación, identidad pendiente, revisión humana, propiedad y estadía. Sin designación ni verificación por defecto. |
| Primera propiedad | Terminología técnica y configuración admitida difícil de reconocer | Se reutiliza el mismo formulario estructurado, vacío/inert/disabled: calle/número obligatorios, piso/unidad opcionales. Explica Departamento/Español/15:00/10:00 y ausencia de edificio. Configuración diferente sigue no disponible; ningún campo se descarta para aceptarla. |
| Borrador y resultado | Las páginas mostraban HELD/UNKNOWN/COMMIT y detalles internos | Copia orientada al usuario: pendiente de habilitación, no creado, resultado sin confirmar y comprobación antes de continuar. Atributos/protocolos internos no se renombran. |
| Panel QA | Etiquetas dinámicas y HTML inicial afirmaban sesión verificada/datos reales y envío de contraseña | Se corrigen ambas capas para indicar demostración sin identidad acreditada ni envío de credenciales. Se retira también el plazo de soporte de ejemplo, no aprobado como compromiso del producto. |
| Estadías | Fechas bajo “Acceso:” incluso para estadía cancelada/finalizada; fechas inválidas se imprimían literalmente | Estado de acceso previsto presentado con cautela: no disponible, check-in pendiente o verificación vigente requerida. Fechas no autorizan acceso. Valor inválido pasa a “Fecha no disponible”. |
| Respuesta tardía | Una fila recibida después del checkout seguía presentando la ventana sin explicación de cierre | La presentación consulta el estado/fecha al renderizar. Dos reservas consecutivas conservan sus IDs y filas separadas. Sin timer/cron ni revocación real desde JavaScript. |
| Huésped | Pre-arrival mezclaba detalles técnicos con estados del viaje | Misma página prearrival: invitación/verificación, antes de llegar, check-in pendiente, durante estadía y después del checkout. Sólo explica estados; no se creó portal privado ni contenido de propiedad. Free queda separado. |
| Solicitudes/incidencias | Estados vacíos decían “reales” en el laboratorio | Mensajes neutrales para revisar; se conservan DTO, scope, mediación y controles previos. Ninguna decisión, comunicación, aprendizaje o confirmación de efecto nuevo. |
| Incertidumbre/sesión | Mensaje del formulario retenido y una advertencia de cierre contenían UNKNOWN/JWT | Se comunica resultado sin confirmar, no reenviar y cierre remoto pendiente. Se mantienen los controles y marcadores anteriores; no se afirma revocación real. |
| Móvil/teclado | Navegación móvil sin Conocimiento/Cuenta y ausencia de reglas comunes de foco/tamaño | Links añadidos, enlace al contenido, foco visible, controles de 44px, texto adaptable y cabecera flexible. Una sola ampliación del CSS existente manager.css, reutilizada por las páginas de planificación. No conformidad ni diseño visual acreditados sin navegador. |

## Archivos existentes reutilizados

`compose.cjs` conserva los parches de contexto anteriores y agrega sólo proyección
y textos QA. `materialize.mjs` reutiliza los formularios extraídos de la composición,
sus IDs/anchors, scripts y estilos. No se copiaron nuevos formularios/CSS/JS a una
aplicación independiente. Los assets generados no se duplican en GitHub: quedan
reproducibles por código y hashes. `overlays/` y `review/` son salidas locales ignoradas.

Se extendieron `verify-composition.mjs`, `acceptance.mjs`, la matriz y pins existentes.
Los ocho casos nuevos usan el DOM harness anterior. Las pruebas históricas no se
actualizaron para cambiar sus expectativas ni se promovieron a evidencia actual.
El SOURCE-PINS del selector fija sus 72 entradas actuales; la evidencia histórica
sigue fijada a sus commits originales y los cuatro casos DTO previos figuran NOT_RERUN.

## Revisión local sin servidor

Desde el checkout **web** de esta rama y con el backend fijado como directorio
hermano `backend` (sólo lectura), si Node/Python ya están disponibles:

```text
node qa/pilot-integration-20261112-v1/materialize.mjs --review
node qa/pilot-integration-20261112-v1/verify-composition.mjs
```

Abrir con el navegador existente:
`qa/pilot-integration-20261112-v1/review/manager/recorrido/index.html`.
Los enlaces/CSS/scripts de estas mismas páginas se vuelven relativos para file://.
No hay servidor, Supabase/PostgreSQL, credenciales o descarga automática. El
generador lee fuentes del backend para la composición histórica, no importa
handlers ni consulta sus servicios. No ejecutar build.js ni despliegues.

La revisión podrá recorrer propiedad/estadías/prearrival y formularios bloqueados.
El panel conserva la pantalla de acceso: no se agrega una identidad o un modo
que saltee su autorización. Los listados sintéticos se probaron en VM, no se
insertaron como cuenta/propiedad verificada en la vista de archivo.

Si el navegador bloquea recursos locales, registrar el límite; no desactivar
protecciones ni levantar infraestructura alternativa. No completar datos reales.
Cerrar la pestaña termina la revisión; las salidas review/ pueden regenerarse sin
tocar otros archivos. No borrar datos o directorios ajenos.

Se verificó el grafo local (120 referencias), CSP connect-src/form-action none,
formularios inertes, IDs/anclas y reproducibilidad de 18 hashes. **Esto no es una
ejecución visual en navegador.** Contraste, zoom, foco efectivo, lector de pantalla,
layout móvil y BFCache real continúan pendientes.
