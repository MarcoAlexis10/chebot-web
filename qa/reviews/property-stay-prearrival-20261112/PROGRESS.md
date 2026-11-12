# Checkpoint recuperable — 2026-11-12

Base web 8cacefa024d2377e31915a9092ae4ea86f493732; backend 9beb837a621f9a8f06601043afa64b3bba317cb5; Native17 ce5c747c3f6fd4b27e0fd32a76e01e72a3192b7a.

Implementados módulos de revisión estricta, frontera de lifecycle retenida, comparación pending/CBF1 sin pérdida de argumentos, guard de calendario y tres páginas inertes integradas al recorrido fundador. Ocho casos nuevos aprobados en dos ejecuciones finales (7 + 1), sin SQL, navegador ni autoridad real. Los logs intermedios se conservan.

Incompatibilidades: no ABI privado para alta/configuración de propiedad; CBF1 y pending requieren huésped; pending fija acceso a las fechas y no admite ventanas ampliadas; operation_id tiene procedencia WhatsApp distinta; UI CABA no equivale a la literal Buenos Aires del guard; conversor original normaliza fechas inválidas; enlaces nuevos a rutas supuestas se corrigieron por destinos existentes. Los once cambios históricos permanecen HELD.

Siguiente ciclo: fijar hashes de fuentes y artefactos generados, completar contratos mínimos de propiedad/estadía/pre-arrival y checklist de piloto, verificar que el compositor fundador y scripts compartidos no cambiaron, publicar cierre final. No investigar host Native17 ni Chromium. Sin laboratorio nuevo; D1–D8 y N01–N12 quedan iguales.
