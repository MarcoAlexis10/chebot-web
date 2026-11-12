# Sucesor Native17 / revisión offline retenida

Extiende el paquete incident-authority-closure anterior. No se conecta al router, build, Auth, PostgreSQL o journal. Todas las entradas operativas y los once cambios históricos permanecen HELD.

`provider-binding.mjs` reutiliza el proof SDK y la frontera CurrentResolution. El productor por defecto deniega; el reviewer exige OFFLINE_FIXTURE. Un source privado resuelve originalRef y consume una capacidad efímera de identidad verificada sobre el bearer exacto; no se persisten bearer, digest o payload. Claim liga proveedor/ref, intención, intento, sesión, expiry y floors. No hay transporte/custodio/proveedor real y los flags de acreditación son false. No se crea protocolo firmado ni claves.

`build_review.py` genera texto SQL DO NOT APPLY. No importa drivers ni ejecuta SQL. El contador de autoridad comienza sin filas/defaults y sólo avanza desde un estado previamente acreditado; los hooks separan cambios de relación/autorización de actualizaciones del estado de negocio. Cada lectura exige igualdad con un floor independiente actual, no un piso obtenido del backup. La fuente protegida de ese floor sigue vacía y los gates siguen denegando.

La admisión tiene tabla propia: reservar intent_binding antes del efecto impediría la primera escritura en el writer anterior. NEW/KNOWN preservan el original por referencia privada; claim no implica COMMIT del efecto. Los entries ligados al proveedor necesitan ABI 17/10, en lugar del 16/9 anterior. No se usa el entry antiguo como fallback para perder providerBindingRef. El negocio y los controles de scope/floor se derivan del SQL anterior sellado.

Los artefactos son propuestas de revisión, abortan antes de DDL y terminan en rollback. Persistencia de IDs/metadatos requiere también finalidad/minimización/custodia/retención; no se ejecuta ni se agrega almacenamiento personal. Revisión de ACL/RLS/captura y prerrequisitos se consolidan en el cierre nuevo.
