# Roadmap, backlog, pruebas y despliegue

## 1. Prioridades

- **P0:** imprescindible para usar el MVP con seguridad.
- **P1:** necesario para un piloto cómodo; puede salir inmediatamente después.
- **P2:** evolución, no bloquea MVP.

## 2. Backlog por épicas

### E0 - Descubrimiento y diseño

- [ ] **P0** Validar matriz de campos de Anexos 1, 2, 3 y 5.
- [ ] **P0** Cotejar y aprobar pedagógicamente los 45 descriptores transcritos en `06-CATALOGO-RUBRICA.md`.
- [ ] **P0** Definir checks de documentación física.
- [ ] **P0** Definir reglas de No aplica, retención, acceso y reapertura.
- [ ] **P0** Crear muestras llenas y casos límite para cada PDF.
- [ ] **P0** Aprobar wireframe del flujo por pasos.

### E1 - Fundación técnica

- [ ] **P0** Crear repositorio, clasp y proyectos DEV/UAT/PROD.
- [ ] **P0** Configurar manifiesto con scopes mínimos.
- [ ] **P0** Crear spreadsheet y cabeceras versionadas.
- [ ] **P0** Implementar config, errores, request ID, autenticación y autorización.
- [ ] **P0** Implementar repositorios, locks y control de versión.
- [ ] **P0** Crear script idempotente de inicialización/seed.
- [ ] **P1** Pipeline de lint, pruebas y despliegue con versión.

### E2 - Administración

- [ ] **P0** CRUD/desactivación de usuarios y docentes.
- [ ] **P0** Configuración institucional.
- [ ] **P0** Catálogo versionado de rúbrica y criterios generales.
- [ ] **P0** Configuración de plantillas y carpetas.
- [ ] **P1** Importación CSV de docentes con vista previa y reporte.

### E3 - Evaluación manual

- [ ] **P0** Listado/filtros de evaluaciones.
- [ ] **P0** Crear y editar datos generales.
- [ ] **P0** Capturar Anexo 1 y checks físicos.
- [ ] **P0** Capturar seis criterios generales con argumentos.
- [ ] **P0** Capturar 15 criterios mostrando descriptores.
- [ ] **P0** Capturar Anexo 5 manual.
- [ ] **P0** Guardar/recuperar borradores y detectar conflictos.
- [ ] **P0** Validar, revisar, finalizar, bloquear y crear snapshot.
- [ ] **P0** Reabrir/anular con rol y motivo.

### E4 - Documentos

- [ ] **P0** Crear/aprobar plantillas oficiales de Anexos 1, 2, 3 y 5.
- [ ] **P0** Implementar render por snapshot y marcas de casilla.
- [ ] **P0** Exportar PDF individual, metadatos e idempotencia.
- [ ] **P0** Combinar expediente 1-2-3-5.
- [ ] **P0** Manejar errores/reintentos y temporales.
- [ ] **P0** Regresión visual y de contenido.
- [ ] **P1** Vista previa embebida o enlace seguro antes de descarga.

### E5 - IA

- [ ] **P0** Definir evaluación de privacidad y proveedor.
- [ ] **P0** Implementar adapter, secreto, timeout y salida JSON.
- [ ] **P0** Crear prompt versionado y dataset de prueba anonimizado.
- [ ] **P0** UI para generar, descartar, editar, aceptar/regenerar.
- [ ] **P0** Confirmación humana y auditoría.
- [ ] **P0** Fallback manual cuando IA está desactivada o falla.
- [ ] **P1** Métricas de aceptación/edición y control de consumo.

### E6 - Operación

- [ ] **P0** Auditoría, logs y panel mínimo de errores.
- [ ] **P0** Respaldo y restauración probada.
- [ ] **P0** Manual de administrador y guía rápida del evaluador.
- [ ] **P0** UAT, capacitación y piloto controlado.
- [ ] **P0** Checklist de publicación y rollback.
- [ ] **P1** Reconciliación automática de jobs/documentos atascados.
- [ ] **P2** Analítica agregada, seguimiento y multiinstitución.

## 3. Sprints sugeridos

| Sprint | Objetivo | Demostración |
|---|---|---|
| 0 | validar formato y decisiones | anexos llenos de ejemplo + mapa de campos |
| 1 | base y seguridad | acceso por roles + datos iniciales |
| 2 | captura | borrador completo hasta rúbrica |
| 3 | cierre | Anexo 5 manual + estados + snapshot |
| 4 | documentos | cuatro PDFs y expediente |
| 5 | IA | propuesta editable + fallback |
| 6 | robustez | pruebas, UAT, respaldo, manuales y producción |

Duración sugerida: 1-2 semanas por sprint; ajustar a disponibilidad y no comprimir el ciclo de aprobación documental.

## 4. Estrategia de pruebas

### Unitarias

- Transiciones válidas/inválidas.
- Reglas de obligatoriedad y longitudes.
- Mapeo nivel-descriptor.
- Normalización, nombres de archivo y hashes.
- Autorización por rol/propiedad.
- Construcción y validación de DTO/snapshot.

Objetivo: alta cobertura de dominio y casos de uso críticos; no perseguir porcentaje sobre wrappers triviales.

### Integración

- Repositorios contra spreadsheet DEV aislado.
- Escrituras multihoja, locks, conflicto de `row_version` y compensación.
- Copia/reemplazo/exportación de Docs.
- ACL y ubicación de archivos Drive.
- IA simulada; una prueba controlada real por release.

### End-to-end

- Evaluación totalmente lograda.
- Mezcla de niveles, desacuerdos argumentados y No aplica.
- Texto largo, tildes, ñ, saltos, comillas y caracteres especiales.
- Fallo de red/IA/PDF y reintento sin duplicados.
- Dos pestañas editando la misma evaluación.
- Reapertura, nueva versión y reimpresión.
- Usuario no autorizado y acceso a visita ajena.

### Regresión documental

Para cada anexo y expediente:

- mismo ID, docente, fecha y datos generales;
- selecciones correctas en 6 + 15 criterios;
- descriptor correcto por nivel;
- Anexo 4 ausente;
- saltos, tablas, encabezados, pies, número de páginas y espacios de firma;
- sin texto cortado, superpuesto, páginas en blanco ni marcadores sin reemplazar;
- archivos individuales y conjunto con mismo `snapshot_hash`.

Mantener PDFs “golden” anonimizados. Cuando cambie una plantilla, revisar diferencias visualmente y aprobar la nueva referencia.

### Seguridad y rendimiento

- Acceso directo a endpoints sin permiso.
- Inyección de HTML/fórmulas (`=`, `+`, `-`, `@`) al exportar datos.
- Secreto ausente/no expuesto.
- Enlaces Drive no públicos.
- Carga con volumen esperado multiplicado por 3.
- Cuotas y tiempo máximo simulados; recuperación de jobs.

## 5. Datos de prueba mínimos

- 3 roles y un usuario inactivo.
- 10 docentes, uno inactivo.
- Una rúbrica activa y otra retirada.
- Visitas en cada estado.
- Casos con todos los niveles, No aplica, desacuerdo, textos máximos y Unicode.
- IA: salida válida, JSON inválido, vacío, timeout, contenido fuera de evidencia.
- Documento: éxito, permiso denegado, plantilla incompleta y reintento.

No usar datos personales reales fuera de PROD.

## 6. Definition of Done

Una historia está terminada cuando:

- cumple criterios funcionales y autorización server-side;
- incluye pruebas pertinentes y pasa regresión;
- errores tienen código/mensaje y auditoría cuando corresponde;
- no incorpora secreto ni ID de ambiente al código;
- documentación/ADR/configuración se actualizó;
- fue revisada y demostrada en UAT si afecta anexos o flujo;
- cumple accesibilidad básica y no deja estados ambiguos.

Un anexo no está terminado hasta aprobar visualmente todos sus casos de muestra.

## 7. Preparación del despliegue

1. Crear proyecto, Sheet, carpetas y plantillas del ambiente.
2. Ejecutar inicialización y validar cabeceras/esquema.
3. Configurar propiedades y secretos.
4. Sembrar catálogos aprobados y usuarios iniciales.
5. Verificar scopes, cuenta ejecutora y ACL.
6. Publicar versión inmutable de Web App; no usar HEAD en producción.
7. Ejecutar smoke test con evaluación sintética.
8. Generar y revisar cinco documentos.
9. Confirmar logging, respaldo, soporte y rollback.
10. Registrar versión, fecha, aprobadores y cambios.

## 8. Rollback y recuperación

- Conservar al menos la versión anterior del despliegue y de las plantillas.
- Rollback de código no revierte datos; ejecutar migraciones aditivas y reversibles.
- Antes de cambios de esquema, crear copia identificada y verificarla.
- Si falla documento/IA, desactivar función mediante feature flag, no detener captura manual.
- Si hay corrupción, poner Web App en modo mantenimiento, preservar evidencia, restaurar copia y reconciliar por auditoría/snapshots.

## 9. Operación y mantenimiento

### Diario/semanal

- Revisar errores y jobs atascados.
- Verificar consumo/cuotas y almacenamiento.
- Resolver accesos y catálogos mediante proceso autorizado.

### Mensual

- Comprobar respaldo restaurable.
- Revisar permisos/usuarios inactivos.
- Revisar tasa de fallos, latencia e IA aceptada/editada.

### Por release

- Actualizar versión, changelog y matriz de compatibilidad de esquema/plantilla/rúbrica.
- Ejecutar pruebas de regresión y UAT selectivo.
- Comunicar cambios visibles y mantener rollback.

## 10. Criterios de salida por fase

- **Diseño:** ningún campo o descriptor pendiente y muestras aprobadas.
- **Núcleo:** flujo manual completo, integridad y roles aprobados.
- **Documentos:** regresión visual/contenido sin defectos altos.
- **IA:** privacidad aprobada, fallback manual y revisión humana demostrados.
- **Piloto:** al menos 5 evaluaciones reales controladas, incidencias críticas cerradas y métricas base capturadas.
- **Producción:** aceptación formal, capacitación, respaldo restaurado en prueba y responsable de soporte asignado.
