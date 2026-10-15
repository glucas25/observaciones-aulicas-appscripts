# 🤝 Guía de Contribución (Contributing Guidelines)

¡Gracias por tu interés en colaborar con el **Sistema de Observaciones Áulicas**! Este proyecto de código abierto tiene como objetivo proporcionar a las instituciones educativas una solución moderna, ética y reproducible para la gestión del acompañamiento pedagógico en Google Workspace.

Toda contribución —desde reportar un error o mejorar la redacción de un descriptor pedagógico, hasta optimizar código o añadir nuevas integraciones— es bienvenida.

---

## 📋 Formas de Contribuir

Puedes colaborar de diferentes maneras, no solo programando:

1. **Reportar Errores (*Bug Reports*)**: Si encuentras un comportamiento inesperado o fallo en la aplicación, abre un [Issue en GitHub](https://github.com/glucas25/observaciones-aulicas-clasp/issues) con pasos claros para reproducirlo.
2. **Sugerir Mejoras o Funcionalidades**: ¿Tu institución o distrito requiere adaptaciones pedagógicas (por ejemplo, reportes adicionales o ajustes en rúbricas)? Abre una propuesta en Issues para dialogar sobre la necesidad.
3. **Mejorar la Documentación**: Corrección de erratas, guías adicionales de configuración o mejoras en los manuales de usuario.
4. **Aportar Código (*Pull Requests*)**: Corrección de incidencias o desarrollo de nuevas características acordadas.

---

## 🛡️ Política Estricta de Privacidad y Seguridad

> [!CAUTION]
> **CERO DATOS SENSIBLES O INSTITUCIONALES EN EL REPOSITORIO**
>
> - **NUNCA** subas en un commit o Pull Request información real de instituciones educativas, nombres de docentes o estudiantes, identificadores reales de carpetas de Drive, ni claves de API (`AI_API_KEY`, etc.).
> - El archivo `.gitignore` ya protege `institution.config.json` y `.clasp.json`. Asegúrate de no forzar su subida.
> - Para pruebas unitarias o ejemplos, utiliza siempre datos ficticios o genéricos (tal como se muestra en `institution.config.example.json`).

---

## 💻 Entorno de Desarrollo y Flujo de Trabajo

### 1. Prerrequisitos
- [Node.js](https://nodejs.org/) v20 o superior.
- Git instalado.
- *(Opcional)* Google Clasp (`npm install -g @google/clasp`) si vas a probar en un proyecto real de Apps Script.

### 2. Pasos para Colaborar con Código

1. **Haz un Fork** del repositorio en GitHub:
   Haz clic en el botón **Fork** en la esquina superior derecha del repositorio.

2. **Clona tu fork localmente**:
   ```bash
   git clone https://github.com/TU_USUARIO/observaciones-aulicas-clasp.git
   cd observaciones-aulicas-clasp
   ```

3. **Crea una rama para tu cambio**:
   ```bash
   git checkout -b feature/nombre-de-tu-mejora
   # o para correcciones:
   git checkout -b fix/descripcion-del-bug
   ```

4. **Realiza tus cambios siguiendo los principios del proyecto**:
   - **Clean Architecture / DDD**: Respeta la separación de capas (`src/domain/`, `src/application/`, `src/gateways/`, `src/repositories/`, `src/ui/`).
   - **No datos cableados (*Zero-hardcoding*)**: Toda configuración debe ser parametrizable vía `institution.config.json` o Script Properties.
   - **IA Human-in-the-loop**: Cualquier función asistida por IA debe mantener la supervisión humana, tono pedagógico in situ y excluir el compromiso docente.

5. **Verifica las pruebas unitarias y la integridad del proyecto**:
   Antes de enviar cualquier cambio, ejecuta obligatoriamente:
   ```bash
   # Ejecuta las 69 pruebas unitarias locales
   npm test

   # Valida el esquema, catálogos pedagógicos y UI
   npm run validate
   ```
   *Ambos comandos deben finalizar con éxito (código de salida 0).*

6. **Haz commit y push de tu rama**:
   ```bash
   git commit -m "feat: breve descripción en presente del cambio"
   git push origin feature/nombre-de-tu-mejora
   ```

7. **Abre un Pull Request (PR)**:
   - Ve a GitHub y abre un Pull Request hacia la rama `main` del repositorio principal.
   - Explica con claridad qué problema resuelve tu cambio y cómo probarlo.
   - El pipeline de Integración Continua (CI) de GitHub Actions ejecutará automáticamente los tests.

---

## ⚖️ Licencia

Al contribuir a este proyecto, aceptas que tus contribuciones se licencian bajo la misma [Licencia MIT](./LICENSE) del repositorio.
