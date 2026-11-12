# Propiedad del fundador: contrato y frontera retenida

Fuentes inmutables: backend `9beb837a621f9a8f06601043afa64b3bba317cb5`, web `8cacefa024d2377e31915a9092ae4ea86f493732`. SHA-256 y blobs individuales: `../../property-stay-prearrival-20261112-v1/SOURCE-PINS.json`.

## Lo que existe

`25-MIGRACION-02-BUILDINGS-PROPERTIES-PERMISSIONS.sql` define `concierge_properties`: id, account_id, building_id opcional, internal_name (1–160), property_type (apartment/house/room/studio/other), address (1–500), floor_or_unit opcional (1–80), city (1–160), default_language (es/en/it/pt), horarios habituales y estado. El building debe pertenecer a la misma cuenta. Los estados son draft/ready_for_review/active/paused/archived; active exige activated_at. Son restricciones escritas, no observadas en un catálogo instalado.

`127-MIGRACION-15-MANAGER-WEB-AUTH-TENANT-GUARD.sql` vincula auth.users con identidad web activa y miembro de la misma cuenta. `concierge_resolve_manager_web_context` recibe el usuario verificado por el proveedor, no account_id del navegador. `concierge_authorize_manager_member_action` comprueba miembro activo, propiedad de su cuenta y acción específica: view_property/manage_stays/manage_incidents/approve_requests/manage_knowledge/manage_secrets/manage_team. owner/manager tienen las capacidades históricas; co_manager exige asignación y flags por propiedad. **Ninguna de esas acciones equivale a crear una propiedad nueva.** El rol operativo por tarea es independiente (Migration 12), no un co_manager promocionado.

El GET y la sección del panel permiten lectura, no alta. El inventario de funciones de SQL raíz encontró `concierge_list_manager_web_properties`; no encontró una función de alta de propiedad. Ese alcance de búsqueda no acredita ausencia universal ni instalación remota. El codec privado fijado admite sólo create_stay, no property create/update/revoke. No se inventa endpoint o nombre RPC.

## Incompatibilidades comprobables

| Contrato | Incompatibilidad | Candidato seguro |
|---|---|---|
| Jurisdicción | UI CABA; `checkConciergeBetaCityScope` exige exactamente ciudad `Buenos Aires` y propiedad activa | No traducir una etiqueta del cliente a autorización. cityAttestationRequired=true; guard histórico intacto |
| Unicidad | PK id y unique(id,account_id) no evitan duplicar una dirección/unidad ni fijan cupo 1/1 | Sólo indicio local sintético de duplicado por cuenta/dirección/unidad; no hash de dirección, persistencia o promesa SQL |
| Permiso | Flags por propiedad no autorizan crear la propiedad que todavía no existe | Alta, modificación y revocación permanecen HELD; falta permiso y productor protegido específicos |
| Publicación | Dirección/unidad/nombre interno no son una bienvenida pública aprobada | Formulario inerte en blanco, sin transferencia a pre-arrival, códigos ni Wi-Fi |

## ABI faltante, sin implementación operativa

El futuro contrato deberá resolver identidad/sub/session/issuer/exp verificados, vínculo web→miembro→cuenta único y vigente, restricciones y revisiones actuales, elegibilidad del fundador y cupo de una propiedad, jurisdicción CABA acreditada por fuente confiable, propiedad/building de la misma cuenta, permiso específico y reglas de delegación. Identificadores, roles, status y activated_at son del servidor. La UI no elige autoridad ni activa estados.

Entrada de negocio mínima propuesta para revisión: nombre interno, tipo, dirección/unidad, idioma y horarios. No incluye PII de huéspedes, claves, Wi-Fi ni códigos. La dirección es información privada; el formulario no la recopila. Hay que acordar fundamento, custodia, acceso y retención D02-A antes de persistencia real. Jurisdicción/cupo no se infieren de texto libre.

Antes de despacho: validar estado, versión, cardinalidad y restricciones dentro del fence y orden de locks aprobados. Después de posible efecto: intento vinculado al original confiable, recibo correlacionado, COMMIT externo, reader sin write y journal/witness independientes. Error previo verificable puede cerrar la admisión; error de red/ACK después del posible despacho conserva UNKNOWN y prohíbe reenvío. Revocación/archivo deben invalidar accesos relacionados y evitar mostrar datos a una sesión revocada sin borrar la historia confirmada.

La interfaz actual no define un recibo SUCCESS: `reviewPropertyShape` sólo revisa forma; `createHeldLifecycleCandidate().property()` permanece HELD incluso ante callbacks o recibos aportados por el cliente. No hay persistencia, DML ni asignación de id. La prevención de duplicados entre procesos y las transiciones reales requieren un contrato protegido y validación nativa autorizada.
