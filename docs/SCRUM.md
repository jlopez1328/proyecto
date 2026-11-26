# Organización Scrum

Esta entrega incluye un backlog, criterios de aceptación y una propuesta de trabajo. No se presentan reuniones ni sprints como realizados: la planificación sirve para revisión, aceptación y mantenimiento del proyecto por el equipo.

## Roles y ceremonias

- Product Owner: representante del negocio; prioriza y acepta historias.
- Scrum Master: facilita el proceso y elimina impedimentos.
- Developers: construyen, revisan y prueban el incremento.

Sprints propuestos de dos semanas. Sprint Planning al inicio; Daily de 15 minutos; refinamiento semanal; Review con demostración y retrospectiva al terminar. El equipo asigna personas y fechas reales antes de comenzar. No se inventan nombres ni velocidad histórica.

| Sprint | Objetivo | Historias | Puntos estimados |
| --- | --- | --- | --- |
| 1 | Base visual, cuentas y permisos | HU-01 a HU-03 | 13 |
| 2 | Panel, productos y compras | HU-04 a HU-06 | 16 |
| 3 | Venta segura con descuentos | HU-07 a HU-09 | 16 |
| 4 | Inventario, daños, calidad y entrega | HU-10 a HU-15 | 27 |

Las cifras son estimaciones iniciales; Sprint 4 debe ajustarse según capacidad o dividirse antes del compromiso. El backlog completo y sus criterios están en `docs/backlog.json`. El importador crea issues y los enlaza a GitHub Projects con Sprint y Puntos; se mantienen abiertos para revisión del equipo.

## Tablero

Usa los estados Todo, In Progress y Done del campo Status. Crea vistas de tablero por estado, tabla por Sprint y lista de bugs. Mantén las historias pequeñas y limita trabajo en progreso a una historia por persona. Cada pull request enlaza el issue con Closes #n. En Project configura flujos nativos para pasar elementos cerrados a Done y reabiertos a Todo.

El workflow project.yml agrega issues y pull requests nuevos al tablero cuando se configure la variable PROJECT_URL y el secreto ADD_TO_PROJECT_PAT. CI verifica pruebas y compilación en cada rama/PR. El repositorio no puede activar protección de ramas ni crear recursos externos sin autenticación de GitHub; el manual explica la configuración.

## Definition of Ready

Historia con rol, objetivo, valor, criterios observables, dependencias identificadas y estimación acordada. Los cálculos de impuestos, descuentos y permisos deben tener ejemplos concretos.

## Definition of Done

Código revisable, criterios demostrados, pruebas pertinentes y compilación aprobadas, permisos verificados, sin secretos versionados, documentación actualizada y aceptación del Product Owner. Un archivo de código o un issue creado no equivale por sí solo a una historia aceptada.

## Revisión sugerida

Demuestra un flujo completo: administrador crea comprador/vendedor → comprador crea y recibe producto → vendedor registra venta con descuentos → comprador registra daño → administrador revisa inventario e informes. Verifica también un intento sin permisos, compra inválida sin cambios parciales y venta concurrente sobre una sola unidad.
