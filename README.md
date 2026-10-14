# 🏫 Sistema de Observaciones Áulicas (Google Workspace Enterprise)

[![CI](https://github.com/glucas25/observaciones-aulicas-appscripts/actions/workflows/ci.yml/badge.svg)](https://github.com/glucas25/observaciones-aulicas-appscripts/actions/workflows/ci.yml)
![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-V8%20Runtime-4285F4?logo=google&logoColor=white)
![Architecture](https://img.shields.io/badge/Architecture-Clean%20%2F%20DDD-0ea5e9)
![Node.js](https://img.shields.io/badge/Node.js-v20%2B-339933?logo=node.js&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

> **Plataforma web integral para la gestión, rúbrica pedagógica y generación automatizada de expedientes de observación áulica**, construida sobre el ecosistema **Google Workspace** (Apps Script, Sheets, Docs y Drive).

Diseñado con estándares de **Clean Architecture**, control de concurrencia optimista, snapshots criptográficos inmutables para validez legal/auditoría y configuración institucional desacoplada mediante JSON.

---

## 🌟 Características Principales

- **🏛️ Arquitectura Desacoplada y Parametrizable**: Cero datos institucionales cableados (*hardcoded*). Toda la identidad (colegio, logos de Drive, distritos, zonas, rectorado y propiedades) se inicializa desde `institution.config.json`.
- **📊 Google Sheets como Base de Datos Relacional**:
  - Esquema estricto de 19 tablas versionadas e idempotentes.
  - Bloqueo transaccional de concurrencia con `LockService`.
  - Control de versiones optimista (`row_version`) para evitar sobreescritura accidental entre evaluadores.
  - Saneamiento contra inyección de fórmulas (`=`, `+`, `-`, `@`).
- **📑 Generación de Expedientes Oficiales en PDF**:
  - Renderizado dinámico de los **Anexos 1, 2, 3 y 5** (incluyendo el paquete consolidado oficial).
  - Encabezado institucional con logotipo de Google Drive y caché multinivel (`CacheService` en memoria) para optimizar cuotas de Drive.
  - Marcadores de agua, pie de página estandarizado y metadatos trazables.
- **🔒 Integridad y Snapshots Inmutables**:
  - Al finalizar una evaluación se genera un snapshot `SHA-256`. Los documentos nunca leen datos editables post-cierre.
  - Flujo de estados formal: `BORRADOR` ➔ `EN_REVISION` ➔ `FINALIZADA` ➔ `DOCUMENTOS_GENERADOS`.
  - Reapertura auditada y anulación controlada exclusivas para rol Administrador.
- **👥 Roles y Seguridad en Servidor (RBAC)**:
  - Perfiles: `ADMIN`, `DIRECTIVE`, `EVALUATOR` y `TEACHER`.
  - Flujo colaborativo: El docente observado puede ingresar con su cuenta Google para redactar y firmar su compromiso en el Anexo 5 antes del cierre.
- **🤖 Asistente Pedagógico con IA (Google Gemini 3.8 Flash)**:
  - Integración nativa con **Google Gemini API** (`gemini-3.8-flash`, compatible con alias `3.8`) mediante salida estructurada JSON estricta (`responseMimeType: application/json`). Soporte secundario para OpenAI (`gpt-4o-mini`).
  - **Voz del evaluador in situ**: Redacción concisa, directa y orientada a la retroalimentación formativa. Cuando todos los criterios están logrados, emite felicitaciones explícitas en Observaciones Finales y consolida buenas prácticas sin recurrir a meta-comentarios de falta de datos.
  - **Autoría docente exclusiva**: El *Compromiso del docente* en el Anexo 5 nunca es generado por la IA; se reserva para la redacción y firma del propio docente observado.
  - **Herramienta 100% opcional (Human-in-the-loop)**: Exige haber completado el Anexo 1 (registro narrativo) y los 15 criterios de la rúbrica; el evaluador siempre revisa y aprueba el borrador.
- **🧪 Calidad e Integración Continua**:
  - Suite de **43 pruebas unitarias nativas** con `node:test` simulando todos los servicios de Google Workspace (Sheets, Docs, Drive, Cache, Lock, UrlFetch).
  - Pipeline de GitHub Actions (CI) con validación sintáctica V8 y verificación de catálogos.

---

## 🏗️ Arquitectura del Sistema

El proyecto sigue una arquitectura en capas inspirada en Domain-Driven Design (DDD):

```
┌────────────────────────────────────────────────────────┐
│               PRESENTACIÓN (HTML Service)              │
│      App.html · ApiClient.html · Styles.html (SaaS)     │
└───────────────────────────┬────────────────────────────┘
                            │ google.script.run
┌───────────────────────────▼────────────────────────────┐
│                    API CONTROLLERS                     │
│    ApiController.gs (Mapeo DTOs, Auth, RequestId)      │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                  APPLICATION SERVICES                  │
│  VisitService · FinalizationService · DocumentService  │
│         AdminService · CatalogService · AiDraftService │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│                      DOMAIN LOGIC                      │
│   VisitState (Máquina de Estados) · Validation · RBAC  │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
┌─────────────▼────────────┐  ┌────────────▼─────────────┐
│  REPOSITORIES & STORAGE  │  │    GATEWAYS & DRIVERS    │
│    SheetsRepository.gs   │  │      DocsGateway.gs      │
│  (Persistencia en Sheets │  │  (Templates Docs -> PDF) │
│    + Locks + Migraciones)│  │      DriveApp Caching    │
└──────────────────────────┘  └──────────────────────────┘
```

---

## 🚀 Guía de Despliegue Paso a Paso (Para Nuevas Instituciones)

Sigue estos 5 pasos para desplegar el sistema en cualquier institución educativa sin tocar una sola línea de código fuente.

### Prerrequisitos
1. [Node.js](https://nodejs.org/) (versión 20 o superior).
2. Google Clasp instalado globalmente:
   ```bash
   npm install -g @google/clasp
   ```
3. Inicia sesión en Google con la cuenta institucional que administrará el proyecto:
   ```bash
   clasp login
   ```
   > [!IMPORTANT]
   > Asegúrate de tener habilitada la API de Google Apps Script en tu cuenta de Google visitando: [script.google.com/home/usersettings](https://script.google.com/home/usersettings) y activando el interruptor **Google Apps Script API**.

---

### Paso 1: Clonar el repositorio y vincular con Apps Script
```bash
git clone https://github.com/glucas25/observaciones-aulicas-appscripts.git
cd observaciones-aulicas-appscripts
```

Crea un nuevo proyecto en Google Apps Script:
```bash
clasp create --type standalone --title "Sistema de Observaciones Aulicas"
```
*(Esto creará automáticamente el archivo `.clasp.json` con el `scriptId` de tu proyecto de Google).*

---

### Paso 2: Personalizar la configuración institucional (`institution.config.json`)
Copia la plantilla de configuración:
```bash
cp institution.config.example.json institution.config.json
```

Abre `institution.config.json` y personaliza los datos de tu institución:
```json
{
  "institution": {
    "institutionCode": "INS-001",
    "name": "Unidad Educativa Ejemplo",
    "location": "Quito",
    "zone": "Zona 9",
    "district": "Distrito 17D01",
    "circuit": "Circuito C01",
    "address": "Av. Principal y Calle Secundaria",
    "defaultShift": "Matutina",
    "logoDriveUrl": "https://drive.google.com/file/d/ID_DE_TU_LOGO_EN_DRIVE/view"
  },
  "initialAdmin": {
    "email": "rectorado@tuinstitucion.edu.ec",
    "displayName": "Rector / Autoridad Institucional",
    "position": "Rector / Rectora"
  },
  "properties": {
    "APP_ENV": "PROD",
    "TIMEZONE": "America/Guayaquil",
    "SUPPORT_EMAIL": "soporte@tuinstitucion.edu.ec",
    "AI_ENABLED": "false",
    "AI_PROVIDER": "GEMINI",
    "AI_MODEL": "gemini-3.8-flash"
  }
}
```
> [!NOTE]
> El archivo `institution.config.json` está protegido en `.gitignore`. Tus datos institucionales nunca se subirán a GitHub.

---

### Paso 3: Probar y subir el código a Google Apps Script
Valida la integridad del proyecto y sube el código:
```bash
# 1. Ejecutar las 43 pruebas unitarias locales
npm test

# 2. Validar esquema, UI y catálogos pedagógicos
npm run validate

# 3. Subir el código a Google Apps Script
clasp push
```

---

### Paso 4: Inicialización automatizada (One-Click Setup)
Abre el editor de Google Apps Script en tu navegador:
```bash
clasp open
```

En el editor de Apps Script tienes dos opciones sencillas para inicializar:

#### Opción A (Recomendada): Vía Script Properties
1. En el menú lateral izquierdo del editor, haz clic en el ícono de engranaje **Configuración del proyecto** (*Project Settings*).
2. Ve a la sección **Propiedades de la secuencia de comandos** (*Script Properties*) y haz clic en **Editar propiedades**.
3. Añade una propiedad:
   - **Propiedad**: `INSTITUTION_CONFIG`
   - **Valor**: Pega todo el contenido de tu archivo `institution.config.json`.
4. Guarda los cambios.
5. Vuelve al editor de código (`< >`), abre `src/bootstrap/Setup.gs`, selecciona la función **`setupFromConfig`** en la barra superior y presiona **Ejecutar**.

#### Opción B: Ejecución directa en consola
Crea una función temporal en el editor y ejecútala:
```javascript
function iniciar() {
  setupFromConfig({
    institution: { name: "Mi Colegio", institutionCode: "INS-001" },
    initialAdmin: { email: "mi.correo@colegio.edu.ec", displayName: "Rector" },
    properties: { TIMEZONE: "America/Guayaquil" }
  });
}
```

> **¿Qué hace `setupFromConfig` automáticamente?**
> - Crea el Google Spreadsheet con las 19 tablas estructuradas.
> - Siembra los 15 criterios y 45 descriptores pedagógicos oficiales.
> - Registra la institución con su logotipo de Drive.
> - Da de alta la cuenta de superadministrador en la tabla `USERS`.

#### Tareas finales en el editor:
- En la barra de funciones, selecciona **`createStarterTemplates`** y haz clic en **Ejecutar**. Esto creará en Google Drive las plantillas de Google Docs y carpetas para exportación de PDFs.
- Selecciona **`installDailyBackupTrigger`** y haz clic en **Ejecutar** para programar el respaldo diario automático de la base de datos a las 2:00 AM.
- *(Opcional)* **Activar Asistente de IA (Gemini 3.8 Flash)**:
  - En **Propiedades de la secuencia de comandos**, agrega o edita:
    - `AI_ENABLED`: `true`
    - `AI_PROVIDER`: `GEMINI`
    - `AI_MODEL`: `gemini-3.8-flash` *(o simplemente `3.8`)*
    - `AI_API_KEY`: Tu API Key obtenida en Google AI Studio.
  - O ejecuta en `Setup.gs`: `enableGeminiAi("TU_API_KEY");`.

---

### Paso 5: Publicar la Aplicación Web (Web App)
1. En la esquina superior derecha del editor de Apps Script, haz clic en **Implementar** (*Deploy*) ➔ **Nueva implementación** (*New deployment*).
2. Selecciona el tipo **Aplicación web** (*Web app*).
3. Configura:
   - **Descripción**: `v1.0.0 Producción Institucional`.
   - **Ejecutar como**: `Yo` (*User deploying / cuenta del administrador*).
   - **Quién tiene acceso**: `Cualquier usuario de la organización` (o `Cualquier usuario con cuenta de Google` si se usa Gmail estándar).
4. Haz clic en **Implementar** y copia la **URL de la aplicación web**.
5. ¡Listo! Abre la URL en el navegador y ya puedes ingresar con tu cuenta de administrador.

---

## 🛠️ Pruebas Unitarias y Validación

El proyecto cuenta con un entorno de pruebas unitarias que no requiere conexión en vivo a Google, permitiendo desarrollo ágil en local:

```bash
# Ejecutar todas las pruebas unitarias
npm test

# Validar integridad del esquema, UI y rúbrica
npm run validate
```

---

## 📚 Documentación Técnica Detallada

La documentación arquitectónica, especificaciones y guías de gobierno se encuentran organizadas en la carpeta [`docs/`](./docs/):

1. **[01-PLAN-MAESTRO.md](./docs/especificaciones/01-PLAN-MAESTRO.md)**: Visión estratégica, riesgos y gobierno de datos.
2. **[02-ESPECIFICACION-FUNCIONAL.md](./docs/especificaciones/02-ESPECIFICACION-FUNCIONAL.md)**: Matriz de permisos (RBAC), ciclo de vida y criterios de aceptación.
3. **[03-ARQUITECTURA-TECNICA.md](./docs/especificaciones/03-ARQUITECTURA-TECNICA.md)**: Patrones de diseño, Clean Architecture, seguridad y estrategia de migración.
4. **[04-MODELO-DATOS.md](./docs/especificaciones/04-MODELO-DATOS.md)**: Diccionario de datos de las 19 hojas, índices y tipos.
5. **[05-ROADMAP-BACKLOG-QA.md](./docs/especificaciones/05-ROADMAP-BACKLOG-QA.md)**: Plan de aseguramiento de calidad (QA) y UAT.
6. **[06-CATALOGO-RUBRICA.md](./docs/especificaciones/06-CATALOGO-RUBRICA.md)**: Matriz oficial de los 15 criterios y 45 descriptores pedagógicos.
7. **[Guía de Producción](./docs/GUIA-IMPLEMENTACION-PRODUCCION.md)**: Manual paso a paso para administradores de sistemas.
8. **[Documentos de Referencia](./docs/recursos/Anexos.docx)**: Formatos ministeriales de los Anexos 1, 2, 3 y 5.

---

## 🤝 Contribuciones

Las contribuciones de la comunidad educativa y técnica son bienvenidas. Si deseas colaborar reportando incidencias, proponiendo adaptaciones curriculares o aportando código, consulta nuestra **[Guía de Contribución (CONTRIBUTING.md)](./CONTRIBUTING.md)** para conocer el flujo de trabajo, estándares de código y políticas de privacidad.

---

## 📄 Licencia

Este proyecto es software libre y está disponible bajo la licencia **[MIT](./LICENSE)**.
