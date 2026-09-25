# Formula Care

**Adiós Excel. Hola cordura.**

Formula Care gestiona los servicios asistenciales de tu farmacia — análisis dermocosmético y bioquímico, nutrición (con seguimiento GLP-1), fichas de paciente, citas e informes — todo en un sitio. Nada de módulos que nunca vas a usar.

Funciona **en tu ordenador, no en la nube de nadie**: los datos de tus pacientes se quedan en tu equipo. No hay servidor que mantener ni cuotas, y para el día a día no necesitas internet (solo para instalar y para enviar correos a los pacientes).

Gratis. Y libre, código incluido — sin letra pequeña, sin límite de pacientes convertido en muro de pago, sin "en beta gratis y luego pagas".

## 🤔 Por qué existe esto

Esta es la versión de escritorio, libre y de código abierto, de [Fórmula Care](https://formulafarma.com/formula-care/) — la herramienta que nació porque no encontraba software que sirviera de verdad en el día a día de una farmacia, así que la construí yo mismo. La promesa siempre fue que el código se haría público en cuanto estuviera listo. Esto es eso.

## ✨ Qué puedes hacer

### Pacientes
- Ficha de cada paciente con sus datos, su historial de visitas y todos sus análisis.
- Búsqueda rápida por nombre, teléfono o email.
- Todas sus medidas (peso, perímetros, bioimpedancia, tensión, pulsaciones) en una sola tabla, con gráficas de evolución.
- ¿Los tenías en Excel? **Impórtalos de una vez** con la plantilla que te da la app: te avisa de las filas con errores y no duplica a nadie.

### Análisis dermocosmético
- Evaluación completa de la piel (hidratación, sebo, elasticidad…), plan de tratamiento y productos recomendados.

### Análisis bioquímico
- Registro de los valores de la analítica, con aviso visual de los que están fuera de rango y cálculo del IMC.
- Seguimiento de la evolución entre analíticas. Los parámetros y sus rangos de referencia se pueden ajustar.
- **Riesgo cardiovascular (SCORE2)** calibrado para España, cuando mides tensión y colesterol en la misma prueba.
- **Test FINDRISC** de riesgo de diabetes cuando mides glucemia o hemoglobina glucosilada, con los puntos de cada pregunta guardados para el seguimiento y anexado al informe.

### Nutrición (con seguimiento GLP-1 opcional)
- Programa por paciente: motivo, objetivo, antecedentes y tratamientos.
- Visitas de seguimiento con medidas, bioimpedancia, tensión, hábitos, actividad física y, si toma un GLP-1, dosis y efectos secundarios.
- Evolución desde la primera visita: porcentaje de peso perdido, hitos del 5, 10 y 15 %, cintura y masa grasa frente a masa magra.
- Registro de alimentación con análisis de picoteo, hambre, saciedad y malestar.
- Sugerencias que explican en qué dato se basan, para que decidas tú qué recomendar.
- Informe de cada visita y hoja de registro en blanco para que el paciente la rellene en casa.

### Citas y calendario
- Calendario mensual con todas las citas (dermo, bio, nutrición, consulta, seguimiento y talleres).
- Estado de cada cita: confirmada, realizada, no se presentó o cancelada.
- El paciente recibe un correo al darle cita, si se cambia o si se cancela, y un **recordatorio el día antes**. También puedes mandarle el recordatorio por WhatsApp con el mensaje ya escrito.
- Cumpleaños de tus pacientes, con aviso el mismo día y felicitación por WhatsApp, correo o registro de que le felicitaste en persona o por teléfono.

### Informes
- Informe de cada servicio con el logo y los colores de tu farmacia: imprimir, guardar en PDF o enviar por correo al paciente.

### Panel de inicio
- Resumen de la actividad con gráficas, avisos, próximas revisiones, cumpleaños, pacientes recientes y accesos rápidos.
- Exportación a Excel de la lista de pacientes y de la actividad del último año.

### Tu farmacia, a tu manera
- Datos de la farmacia, logo y colores (varios temas o los tuyos propios).
- Textos de los correos editables.
- Varios usuarios, cada uno con su contraseña, y un administrador que los gestiona.
- **Ayuda dentro de la app** con guías de cada servicio, de las plantillas de correo y de la importación.

### Protección de datos
- Consentimiento de cada paciente registrado (fecha y versión del texto aceptado).
- Textos legales de la farmacia editables.
- Exportación de todos los datos de un paciente si te los pide, y aviso de los pacientes que superan el periodo de conservación.
- **Copias de seguridad automáticas**, que puedes proteger con contraseña y guardar también en un disco externo o una carpeta de OneDrive, Google Drive o Dropbox.
- **La sesión se cierra sola** si el ordenador se queda desatendido, y un **registro de accesos** muestra quién ha consultado o cambiado cada ficha.

## 💾 Descargar e instalar

Entra en la página de [**descargas (Releases)**](https://github.com/abel-eiras/formula-care/releases) y, en la versión más reciente, descarga el archivo de tu sistema:

| Tu ordenador | Archivo que tienes que descargar |
|--------------|----------------------------------|
| Windows | el que termina en **`.exe`** |
| Mac con chip Apple (M1 o posterior) | el que termina en **`aarch64.dmg`** |
| Mac con procesador Intel | el que termina en **`x64.dmg`** |
| Linux | el que termina en **`.AppImage`** |

> **La primera vez verás un aviso de seguridad.** Es normal: Windows y macOS avisan de todo programa que no haya pagado un certificado de firma, y este es gratuito y sin ánimo de lucro. Abajo tienes cómo continuar. Durante la instalación hace falta conexión a internet.

### 🪟 Windows

1. Abre el archivo `.exe` que has descargado.
2. Si aparece **"Windows protegió tu PC"**, pulsa **"Más información"** y luego **"Ejecutar de todas formas"**.
3. Sigue los pasos del instalador. Al terminar, tendrás Formula Care en el menú Inicio.

(También hay un `.msi` para quien lo prefiera; hace lo mismo.)

### 🍎 Mac

Para saber qué `.dmg` descargar: menú  → **Acerca de este Mac**. Si pone «Chip Apple M…», el `aarch64.dmg`; si pone «Procesador … Intel», el `x64.dmg`.

1. Abre el archivo `.dmg` y arrastra **Formula Care** a la carpeta **Aplicaciones**.
2. La primera vez, en lugar de hacer doble clic, haz **clic derecho** (o Ctrl + clic) sobre la app → **Abrir** → y confirma **Abrir** en el aviso.
   Si aun así no se abre: Ajustes del Sistema → Privacidad y seguridad → **"Abrir igualmente"**.

### 🐧 Linux

Abre una terminal y pega esta línea; descarga la última versión y la deja en el menú de aplicaciones:

```bash
curl -fsSL https://raw.githubusercontent.com/abel-eiras/formula-care/main/scripts/install-linux.sh | sh
```

O descarga el `.AppImage`, dale permiso de ejecución (clic derecho → Propiedades → "Permitir ejecutar") y ábrelo. Si no arranca, puede que falte `libfuse2` (en Ubuntu: `sudo apt install libfuse2`).

## 🚀 Primeros pasos

1. **Crea tu cuenta.** La primera vez que abres la app te pide un nombre, un correo y una contraseña: será la cuenta de administrador.
2. **Configuración → Datos de la Farmacia**: nombre, dirección, teléfono y logo. Aparecen en los informes y en los correos.
3. **Configuración → Correo**: la cuenta desde la que se enviarán los correos a los pacientes. Pulsa **Enviar correo de prueba** para comprobar que funciona (si usas Gmail, necesitarás una *contraseña de aplicación*; la pantalla te explica cómo).
4. **Configuración → Copias de Seguridad**: elige cada cuánto se hacen y, si puedes, una carpeta adicional fuera del ordenador.
5. **Configuración → Usuarios**: crea una cuenta para cada persona del equipo.

## 🔄 Actualizar a una versión nueva

**La app te avisa sola.** Al abrirla, si hay una versión nueva, verás un mensaje con las novedades: pulsa **Actualizar ahora** y la app se descarga, se instala y se vuelve a abrir. Si prefieres hacerlo en otro momento, pulsa **Más tarde** y te lo volverá a ofrecer la próxima vez. También puedes comprobarlo cuando quieras en Configuración → Mi cuenta → **Buscar actualizaciones**.

**Tus datos se conservan**, y antes de actualizar la app guarda por su cuenta una copia de los datos anteriores por si algo saliera mal.

Si lo prefieres, también puedes descargar el instalador de la versión nueva desde [descargas (Releases)](https://github.com/abel-eiras/formula-care/releases) e instalarlo encima.

## ❓ Preguntas frecuentes

### ¿Cómo paso mis datos a otro ordenador?

1. **En el ordenador antiguo:** Configuración → Copias de Seguridad → **Realizar copia ahora**. Después, en la lista «Copias guardadas», pulsa el botón **Guardar en…** de esa copia y guárdala en un USB, un disco externo o una carpeta de OneDrive, Google Drive o Dropbox.
2. **En el ordenador nuevo:** instala Formula Care y ábrela. Te pedirá crear una cuenta: crea una cualquiera, solo sirve para entrar esta primera vez.
3. Ve a Configuración → Copias de Seguridad → **Restaurar una copia** y elige el archivo de la copia (termina en `.fcbackup`). Si la copia está protegida con contraseña, escríbela.
4. La app se cierra la sesión sola. **Entra con tu usuario y contraseña de siempre** (los de la copia): la cuenta que creaste en el paso 2 desaparece.

Se recupera todo: pacientes, citas, análisis, usuarios, configuración del correo, textos y apariencia.

### Se me ha estropeado el ordenador. ¿Puedo recuperar los datos?

Sí, si tienes una copia de seguridad fuera de él. Por eso conviene elegir en Configuración → Copias de Seguridad una **carpeta adicional** (un disco externo o una carpeta sincronizada con OneDrive, Google Drive o Dropbox): cada copia automática se guarda también allí. Con cualquiera de esas copias, sigue los pasos 2 a 4 de la pregunta anterior en el ordenador nuevo.

Sin ninguna copia fuera del ordenador estropeado no hay forma de recuperar los datos desde la app.

### ¿Y si quiero volver a una copia anterior en el mismo ordenador?

Configuración → Copias de Seguridad → **Restaurar una copia** y elige la copia (las automáticas están en la lista «Copias guardadas»; usa **Guardar en…** para sacar la que quieras y luego restáurala). Antes de restaurar, la app guarda por su cuenta una copia del estado actual, por si te arrepientes.

### Olvidé la contraseña de las copias cifradas. ¿Hay forma de abrirlas?

No. Esa contraseña no se guarda en ningún sitio y sin ella nadie puede abrir la copia (esa es precisamente su función). Si la olvidas, cambia la contraseña en Configuración → Copias de Seguridad y haz una copia nueva ahora mismo: las siguientes usarán la nueva.

### ¿Cómo desinstalo Formula Care?

- **Windows:** Configuración → Aplicaciones → Aplicaciones instaladas → **Formula Care** → **Desinstalar** (o desde el Panel de control → Programas).
- **Mac:** arrastra **Formula Care** desde la carpeta Aplicaciones a la Papelera.
- **Linux:** si la instalaste con el comando de arriba, desinstálala con este otro (te preguntará si quieres borrar también los datos):
  ```bash
  curl -fsSL https://raw.githubusercontent.com/abel-eiras/formula-care/main/scripts/install-linux.sh | sh -s -- --desinstalar
  ```
  Si usabas el `.AppImage` suelto, basta con borrarlo.

### ¿Se borran mis datos al desinstalar?

No. Pacientes, citas, configuración y copias de seguridad están en otra carpeta y se quedan ahí, para que reinstalar o actualizar no pierda nada. Si quieres borrarlos también (por ejemplo, porque vas a deshacerte del ordenador), **haz antes una copia y guárdala fuera** y después borra esta carpeta:

| Sistema | Carpeta de datos |
|---------|------------------|
| Windows | `%APPDATA%\com.abeleiras.formulacare` (pégalo en la barra de direcciones del Explorador) |
| Mac | `~/Library/Application Support/com.abeleiras.formulacare` (en Finder: Ir → Ir a la carpeta…) |
| Linux | `~/.local/share/com.abeleiras.formulacare` |

### No llegan los correos a los pacientes

Configuración → Correo → **Enviar correo de prueba**. Te dice en qué paso falla y qué revisar. Mira también la carpeta de spam del destinatario.

### Algo no funciona bien

Configuración → Copias de Seguridad → **Exportar diagnóstico** genera un informe (sin datos de pacientes) con la versión y los últimos mensajes de la app. Puedes adjuntarlo al contarnos el problema en [Issues](https://github.com/abel-eiras/formula-care/issues).

### ¿Puedo ofrecer reserva de citas online desde la web de la farmacia?

Todavía no está disponible.

---

# 🛠️ Para desarrolladores

Todo lo que viene a partir de aquí es técnico: cómo está hecho Formula Care y cómo compilarlo o contribuir.

## Cómo está hecho

- **App de escritorio con [Tauri 2](https://v2.tauri.app/)** que lleva dentro su propio backend Node.js/Express; arranca y se cierra con la app y solo escucha en el propio equipo (`127.0.0.1`).
- **Base de datos SQLite** local con Prisma: una instalación = una farmacia (sin multi-tenant). En el primer arranque se genera un `JWT_SECRET` aleatorio y en cada arranque se aplican las migraciones pendientes, con copia previa de la base de datos (`copias-actualizacion/`).
- **Frontend React + TypeScript** (Vite, shadcn/ui, Tailwind, React Query).
- **Correo** por SMTP (Nodemailer) o Resend, configurable desde la app; ver [backend/EMAIL_CONFIG.md](backend/EMAIL_CONFIG.md).
- **Actualizaciones automáticas** con `tauri-plugin-updater`: la app consulta el `latest.json` del último release publicado y verifica la firma de cada paquete con la clave pública de `src-tauri/tauri.conf.json`. El workflow firma los paquetes si el repositorio tiene los secretos `TAURI_SIGNING_PRIVATE_KEY` y `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (esta firma no es la firma de código de Windows/macOS).
- **Reserva pública de citas (opcional, servicio aparte):** [booking-web/](booking-web/) es un servicio web autohospedable al que la app publica sus huecos libres y del que recoge las solicitudes, cifradas con la clave de la farmacia. Está **desactivado** hasta que haya dónde alojarlo: el interruptor es `RESERVA_ONLINE_DISPONIBLE` en `src/lib/funciones.ts` y `backend/src/config/funciones.ts`.

## Inicio rápido (desarrollo)

### Requisitos Previos
- Node.js 18+ y npm
- [Rust y las dependencias nativas de Tauri](https://v2.tauri.app/start/prerequisites/) (solo si vas a ejecutar/compilar la app de escritorio; no hacen falta para trabajar solo en el frontend o el backend web)
- Git

### Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/abel-eiras/formula-care.git
cd formula-care

# 2. Instalar dependencias del frontend (raíz del repo)
npm install

# 3. Instalar dependencias del backend
cd backend && npm install

# 4. Configurar variables de entorno del backend
cp .env.example .env
# Edita .env si quieres cambiar ADMIN_EMAIL/ADMIN_PASSWORD u otros valores

# 5. Crear la base de datos local y cargar datos de ejemplo
npx prisma migrate deploy
npx tsx src/prisma/seed.ts
cd ..
```

### Ejecutar como app de escritorio (recomendado)

```bash
npm run tauri:dev
```

Esto arranca el backend embebido y abre la ventana de la app. La primera vez, si no has ejecutado el seed, se te pedirá crear la cuenta de administrador.

### Ejecutar como web normal (dos terminales, útil para desarrollar sin Tauri/Rust instalado)

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`

### Credenciales de Desarrollo (tras ejecutar el seed)

| Rol | Email | Contraseña |
|-----|-------|------------|
| Admin | `admin@farmacia.local` | `changeme123` |

Cambia esta contraseña en cuanto inicies sesión. En una instalación de escritorio real (sin seed de datos de ejemplo), la propia app te pedirá crear esta cuenta en el primer arranque.

## Compilar la app de escritorio

```bash
npm run tauri:build
```

Esto compila el frontend, empaqueta el backend (Node + Prisma) como recurso de la app junto con un runtime de Node.js propio (descargado automáticamente la primera vez, ver `scripts/fetch-node-sidecar.mjs`), y genera el instalador nativo de tu sistema operativo en `src-tauri/target/release/bundle/` (AppImage en Linux, `.msi`/`.exe` en Windows, `.dmg`/`.app` en macOS — no se generan `.deb`/`.rpm`, ver [Descargar e instalar](#-descargar-e-instalar)). Como el instalador incluye su propio Node.js, la máquina del usuario final no necesita tenerlo instalado. Cada plataforma debe compilarse en su propio sistema operativo.

Para generar las tres a la vez sin tener las tres máquinas, usa el workflow de GitHub Actions [`desktop-release.yml`](.github/workflows/desktop-release.yml): dispáralo a mano desde la pestaña *Actions* (deja los instaladores como artefactos del run) o haz push de un tag `v*` (crea además un borrador de release en GitHub con los instaladores adjuntos — publícalo manualmente desde la pestaña *Releases* cuando quieras que sea público).

En el primer arranque de un paquete instalado, la app genera automáticamente un `JWT_SECRET` aleatorio y una base de datos SQLite propia en el directorio de datos del usuario del sistema operativo, y aplica las migraciones pendientes en cada arranque (también en actualizaciones futuras) — no hace falta configurar ni migrar nada a mano.

## Tecnologías

### App de escritorio
- **Tauri 2** (Rust) — empaquetado nativo, backend Node embebido como proceso hijo

### Frontend
- **React 18** - Biblioteca de UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Estilos
- **shadcn/ui** - Componentes UI
- **React Router** - Navegación
- **React Query** - Gestión de estado del servidor
- **React Hook Form + Zod** - Formularios y validación

### Backend
- **Node.js + Express** - Servidor API REST
- **Prisma** - ORM para base de datos
- **SQLite** - Base de datos local de cada instalación
- **Zod** - Validación de esquemas
- **TypeScript estricto** - Sin errores de compilación

### Calidad
- **Vitest** - Tests del frontend y del backend (este sobre una base de datos temporal migrada desde cero)
- **Playwright** - Pruebas de extremo a extremo (`npm run test:e2e`): la app compilada contra el backend real con una base de datos nueva, recorriendo primer arranque, pacientes, importación, SCORE2/FINDRISC, ayuda y registro de accesos
- **GitHub Actions** - En cada PR, tipos, lint, tests y builds de todos los proyectos ([`comprobaciones.yml`](.github/workflows/comprobaciones.yml)); los instaladores, con [`desktop-release.yml`](.github/workflows/desktop-release.yml)

## Estructura del proyecto

```
formula-care/
├── src/                        # Frontend React (empaquetado dentro de la app de escritorio)
│   ├── pages/                  # Páginas de la aplicación
│   ├── components/             # Componentes reutilizables
│   │   ├── auth/               # Componentes de autenticación
│   │   ├── dashboard/          # Componentes del dashboard
│   │   ├── layout/             # Layout principal
│   │   └── ui/                 # Componentes shadcn/ui
│   ├── contexts/               # Contextos React (Auth)
│   ├── hooks/                  # Custom hooks (React Query)
│   ├── lib/                    # Utilidades (API, PDF, etc.)
│   └── types/                  # Tipos TypeScript
├── backend/                    # Backend Node.js + Express (embebido en la app de escritorio)
│   ├── prisma/                 # Schema y migraciones (SQLite)
│   └── src/
│       ├── controllers/        # Controladores de API
│       ├── middleware/         # Middlewares (auth, etc.)
│       ├── routes/             # Rutas de API
│       ├── services/           # Servicios (email, copias, notificaciones, RGPD...)
│       └── scripts/            # Scripts de mantenimiento
│   └── tests/                  # Tests del backend (Vitest)
├── src-tauri/                  # Empaquetado de escritorio (Tauri, Rust)
├── booking-web/                # Servicio OPCIONAL y aparte: reserva pública de citas
├── context/                    # Documentación (guías, integraciones, histórico)
├── .github/workflows/          # Comprobaciones en cada PR e instaladores
└── public/                     # Archivos estáticos
```

Para más detalles, ver [context/guias/ESTRUCTURA_PROYECTO.md](context/guias/ESTRUCTURA_PROYECTO.md)

## Scripts

```bash
# Desarrollo web (sin Tauri)
npm run dev          # Inicia el servidor de desarrollo de Vite

# App de escritorio
npm run tauri:dev    # Levanta el backend embebido + la ventana de la app
npm run tauri:build  # Genera el instalador nativo de tu sistema operativo

# Build web
npm run build        # Construye el frontend para producción
npm run build:dev    # Construye en modo desarrollo

# Testing
npm run test         # Tests del frontend
npm run test:watch   # Tests en modo watch
cd backend && npm test   # Tests del backend (base de datos temporal)

# Linting
npm run lint         # Verifica código con ESLint

# Preview
npm run preview      # Previsualiza build de producción
```

## Documentación

- **[context/README.md](context/README.md)** - Índice de documentación (guías, stack, inicio rápido)
- **[AGENTS.md](AGENTS.md)** - Guía para agentes de IA (reglas, checklist, referencias)
- Guías activas en [context/guias/](context/guias/) (código limpio, React, estructura, despliegue, correo)
- Backend: [backend/README.md](backend/README.md), [backend/EMAIL_CONFIG.md](backend/EMAIL_CONFIG.md)
- Reserva pública opcional: [booking-web/README.md](booking-web/README.md)

## Contribuir

Formula Care es software libre. Contribuye si te apetece — programa mucho o programa poco, pero conoce bien el problema que resuelves.

1. Haz un fork del repositorio y crea una rama para tu cambio: `git checkout -b feature/nueva-funcionalidad`
2. Sigue la [Guía de Código Limpio](context/guias/GUIA_CODIGO_LIMPIO.md) y la estructura existente: código y comentarios en español, TypeScript estricto (sin `any`), componentes y funciones pequeños con una sola responsabilidad, y sin sobre-ingeniería.
3. Asegúrate de que todo pasa: `npm run lint`, `npx tsc --noEmit -p tsconfig.app.json` y `npm test` en la raíz, y `npx tsc --noEmit` y `npm test` en `backend/` (la PR lo vuelve a comprobar automáticamente)
4. Haz commit con mensajes claros
5. Abre un Pull Request describiendo el cambio

## Estado y limitaciones conocidas

- Los tres instaladores se compilan en CI, cada uno en su sistema operativo. El de Linux se ha instalado y ejecutado de verdad; los de Windows y macOS de momento solo están verificados por la compilación, no por un arranque manual en esos sistemas.
- Los instaladores no están firmados ni notarizados, y no lo estarán: firmar cuesta dinero y este es un proyecto gratuito. De ahí los avisos de [Descargar e instalar](#-descargar-e-instalar).
- Sin multipuesto: pensado para un solo ordenador por farmacia.

---

## 📄 Licencia

Formula Care es software libre bajo la [Licencia MIT](./LICENSE). Puedes usarlo, modificarlo y redistribuirlo libremente, incluso con fines comerciales, siempre que mantengas el aviso de copyright.
