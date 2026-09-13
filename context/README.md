# Contexto del proyecto - Formula Care

Esta carpeta concentra la documentación de referencia para trabajar en el proyecto, especialmente pensada para **agentes de IA** y desarrolladores que necesiten contexto rápido.

**Arquitectura:** app de escritorio local-first (Tauri + SQLite), software libre (MIT). Sin backend en la nube ni multi-tenancy. Detalle en [STACK.md](STACK.md). Hay un servicio opcional aparte para reserva pública de citas en [../booking-web/](../booking-web/).

## Uso para agentes

- **Primera vez en el proyecto:** Lee [STACK.md](STACK.md) y [QUICKSTART.md](QUICKSTART.md).
- **Escribir o revisar código:** Consulta [guias/GUIA_CODIGO_LIMPIO.md](guias/GUIA_CODIGO_LIMPIO.md) y [guias/REACT_BEST_PRACTICES.md](guias/REACT_BEST_PRACTICES.md).
- **Entender la estructura:** [guias/ESTRUCTURA_PROYECTO.md](guias/ESTRUCTURA_PROYECTO.md).
- **Despliegue:** [guias/GUIA_DESPLIEGUE.md](guias/GUIA_DESPLIEGUE.md).
- **API y backend:** [../backend/README.md](../backend/README.md), [../backend/EMAIL_CONFIG.md](../backend/EMAIL_CONFIG.md).
- **Plantillas de correo y mensajería:** [guias/CONFIGURACION_EMAIL_Y_MENSAJERIA.md](guias/CONFIGURACION_EMAIL_Y_MENSAJERIA.md) (configuración para dejar el sistema de emails funcional).
- **Integraciones opcionales:** [integraciones/GOOGLE_CALENDAR_SETUP.md](integraciones/GOOGLE_CALENDAR_SETUP.md).

## Estructura de esta carpeta

| Carpeta / archivo | Contenido |
|-------------------|-----------|
| [STACK.md](STACK.md) | Stack tecnológico y convenciones del proyecto |
| [QUICKSTART.md](QUICKSTART.md) | Inicio rápido: comandos, variables de entorno, verificación |
| [guias/](guias/) | Guías activas: código limpio, React, estructura, despliegue, email y mensajería |
| [integraciones/](integraciones/) | Guías de integraciones opcionales (ej. Google Calendar) |
| [old/](old/) | Documentación histórica o ya no usada (propuestas, TODOs completados, etc.) |

## Documentación en la raíz

- **[../AGENTS.md](../AGENTS.md)** – Guía principal para agentes de IA (reglas, checklist, referencias).
- **[../README.md](../README.md)** – Visión general del proyecto y estado.

## Skills de proyecto

El proyecto incluye skills en `.cursor/skills/` para Cursor:

- **react-codigo-limpio** – Código limpio y buenas prácticas React (waterfalls, bundle, memoización).
- **stack-farmacia-pontevea** – Stack y estructura del proyecto.

Úsalos cuando escribas o revises código en este repositorio.
