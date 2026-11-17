# Native17: materialización retenida, 17/11/2026

**QA/offline, NO-GO. No instalador, SQL ni infraestructura ejecutados.**

Este paquete reduce defectos de los candidatos de primera propiedad, separa sus
fases y conserva los guards. Las diez fuentes protegidas continúan HELD: no hay
productores constantes, fixtures positivos, credenciales, firmas ni nuevos datos.

## Código

* `review.py`: segmentación léxica acotada de SQL, declaraciones separadas por
  clase/firma, inventario de statements, integridad local y reporte retenido.
  Rechaza rutas externas, symlinks, entradas duplicadas, archivos adicionales,
  exceso de tamaño y cambios en el conjunto exacto de los diez contratos.
  No es un parser de gramática PostgreSQL ni comprueba el cuerpo PL/pgSQL.
* `checks.py`: regresiones puntuales de los defectos localizados. Son pruebas
  de contratos de fuente, no simulación de autorización ni prueba nativa.
* `compare_lab.py`: analiza el AST del texto histórico A57 y el plan puro;
  ejecuta cero comandos de la referencia o receta. Conserva siete diferencias.
* `sql/`: sucesores retenidos. 01 conserva los bytes del candidato post-ASUS.
  02 agrega vinculación histórica KNOWN y revalidación del current read cut.
  03 verifica floor antes de consultar metadatos. 00/04 separan roles y objetos.
  05 propone USAGE/EXECUTE transitivos sólo para los principales declarados;
  no habilita entradas de aplicación. 06 propone el checker histórico de nueve
  argumentos VOLATILE y una sola observación de autoridad/cardinalidad; conserva
  SECURITY INVOKER. Writer=11 y reader/2=26, sin SET ROLE ni cambios en el writer.

El checker 06 es un sucesor de revisión **limitado a property_create**. Deniega
otros dominios, que permanecen retenidos; no se propone aplicarlo globalmente a
una instalación compartida. Su snapshot/cardinalidad requieren evidencia nativa.
El plan no reutiliza `property_receipt_v1` como lector posterior al alta.

## Fuentes y fases

`SOURCE-PINS.json` contiene repositorio/ref/blob/SHA256 de fuentes comprobadas.
`PORT-TRACE.json` registra las diez funciones una por una, sus requisitos de ABI,
productores existentes, autoridad, revocación y fuente ausente. Un requisito de
retorno `void or raises` no es una declaración PostgreSQL ya compilada.

`HISTORICAL-FK-CLOSURE.json` conserva doce relaciones en orden de dependencia,
incluyendo todas las dependencias transitivas conocidas de companion_binding,
manager_result y property_capture. `nativeObjectPresent=null` distingue DDL en
fuente de un objeto realmente instalado. No se quita ninguna FK. La forma Auth
sintética y su RLS FALSE continúan retenidas, sin política de bypass.

`PHASE-PLAN.json` ordena objetos; los archivos 01/02 contienen objetos de más de
una fase y **no se concatenan ni ejecutan por orden de nombre**. P00 detiene
cualquier futura mutación mientras falten productores, custodia, catálogo,
materialización separada por hash o autorización exacta. P40 también explicita
las diez dependencias. `ROLES-AND-BOUNDARIES.json` conserva los owners NOLOGIN,
los LOGIN separados, políticas previstas y brechas restantes.

## Verificación offline reproducible

Desde un checkout íntegro del web en el commit publicado:

```sh
python3 -B qa/native17-materialization-20261117-v1/review.py
python3 -B qa/native17-materialization-20261117-v1/compare_lab.py
python3 -B qa/native17-materialization-20261117-v1/test_review.py
```

El resultado esperado del revisor es `STOP_BEFORE_ANY_MUTATION`, cero pasos de
mutación y 0/10 fuentes acreditadas. Su código carece de ruta de instalación,
incluso si un JSON declara autorización. `SOURCE-LOCK.json` detecta deriva
accidental del paquete bajo una raíz privada sin escritor concurrente; no es
firma, procedencia independiente ni sello nativo. La confianza inicial exige
el checkout/ref/blob fijado, no un manifiesto arbitrario recibido del cliente.

Las pruebas ejecutadas por Work usaron el launcher existente con namespace de
red separado y ambiente vacío. No se repitieron suites históricas ni A01–A59.
Las cuatro pruebas del selector de imagen, antes NOT_RUN, se ejecutaron ahora
con Docker simulado. No se ejecutó el modo de inspección local real.

No se encontró `pglast`/`pg_query` disponible en el runtime consultado y no se
instalaron herramientas. La segmentación de statements no acredita sintaxis,
resolución de dependencias, ACL efectiva, RLS, orden de locks o COMMIT durable.

Para la noche: [ASUS-SESSION.md](ASUS-SESSION.md). Los casos N01–N12,
BPF01–BPF04 y F01–F12 permanecen NOT_RUN; no se creó otra suite de concurrencia.
