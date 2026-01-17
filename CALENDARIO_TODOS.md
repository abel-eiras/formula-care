# 📅 Plan de Implementación: Calendario Integrado Simple

## Resumen del Proyecto
Sistema de calendario integrado con página pública para que los clientes soliciten citas online. Las solicitudes requieren aprobación (o auto-aceptación si está habilitada) y se envían confirmaciones por email.

---

## 📋 Lista de TODOs con Criterios de Aceptación

### **FASE 1: Backend - Modelos y Base de Datos**

#### ✅ TODO 1: Modelo SolicitudCita en Prisma
**Descripción:** Crear modelo para solicitudes de citas desde la página pública.

**Criterios de Aceptación:**
- [ ] Modelo `SolicitudCita` con campos:
  - `id` (String, cuid)
  - `nombreCliente` (String, requerido)
  - `emailCliente` (String, requerido)
  - `telefonoCliente` (String, requerido)
  - `tipo` (String: "dermo" | "bio" | "consulta" | "seguimiento")
  - `fecha` (String, formato ISO)
  - `hora` (String, formato "HH:mm")
  - `estado` (String: "pendiente" | "aprobada" | "rechazada")
  - `notas` (String, opcional - mensaje del cliente)
  - `pacienteId` (String, opcional - si el cliente ya existe en BD)
  - `citaId` (String, opcional - si se convierte en cita)
  - `createdAt`, `updatedAt`
- [ ] Índices en `fecha`, `estado`, `tipo`
- [ ] Relación opcional con `Paciente` (si existe)
- [ ] Relación opcional con `Cita` (si se aprueba)
- [ ] Migración creada y aplicada

---

#### ✅ TODO 2: Modelo ConfiguracionCalendario en Prisma
**Descripción:** Configuración de horarios, bloqueos y auto-aceptación.

**Criterios de Aceptación:**
- [ ] Modelo `ConfiguracionCalendario` (singleton, id="calendario") con campos:
  - `horariosPorTipo` (String, JSON): `{ "dermo": { "lunes": ["09:00-14:00"], ... }, "bio": {...} }`
  - `fechasBloqueadas` (String, JSON): `["2026-01-20", "2026-01-21"]`
  - `horasBloqueadas` (String, JSON): `{ "2026-01-20": ["10:00", "11:00"] }`
  - `autoAceptar` (Boolean, default: false)
  - `duracionPorTipo` (String, JSON): `{ "dermo": 30, "bio": 45, ... }` (minutos)
- [ ] Migración creada y aplicada

---

### **FASE 2: Backend - Lógica de Disponibilidad**

#### ✅ TODO 3: Servicio de Disponibilidad
**Descripción:** Función que calcula disponibilidad considerando citas existentes, horarios configurados y bloqueos.

**Criterios de Aceptación:**
- [ ] Función `obtenerDisponibilidad(tipo: string, fecha: string)` que retorna:
  - Array de horas disponibles para esa fecha y tipo
  - Considera:
    - Horarios configurados para ese tipo de servicio
    - Citas ya existentes del mismo tipo en esa fecha
    - Fechas bloqueadas
    - Horas bloqueadas para esa fecha específica
    - Duración del servicio (no permitir solapamientos)
- [ ] Función `verificarDisponibilidad(tipo: string, fecha: string, hora: string)` que retorna boolean
- [ ] Maneja correctamente diferentes tipos de servicios simultáneamente (puede haber dermo a las 10:00 y bio a las 10:00 si están permitidos)

---

#### ✅ TODO 4: Endpoint GET /api/public/disponibilidad
**Descripción:** Endpoint público (sin autenticación) para obtener disponibilidad.

**Criterios de Aceptación:**
- [ ] Ruta: `GET /api/public/disponibilidad?tipo=dermo&fecha=2026-01-20`
- [ ] No requiere autenticación
- [ ] Retorna: `{ disponible: boolean, horasDisponibles: string[] }`
- [ ] Valida que el tipo sea válido
- [ ] Valida formato de fecha
- [ ] Retorna error 400 si parámetros inválidos

---

#### ✅ TODO 5: Endpoint POST /api/public/solicitar-cita
**Descripción:** Endpoint público para crear solicitud de cita.

**Criterios de Aceptación:**
- [ ] Ruta: `POST /api/public/solicitar-cita`
- [ ] No requiere autenticación
- [ ] Body: `{ nombreCliente, emailCliente, telefonoCliente, tipo, fecha, hora, notas? }`
- [ ] Valida disponibilidad antes de crear
- [ ] Si `autoAceptar=true` y está en horario permitido:
  - Crea la solicitud como "aprobada"
  - Crea el `Paciente` si no existe (buscando por email)
  - Crea la `Cita` automáticamente
  - Envía email de confirmación
  - Crea notificación de tipo "cita" con estado "aprobada"
- [ ] Si `autoAceptar=false`:
  - Crea solicitud como "pendiente"
  - Crea notificación de tipo "cita" con estado "pendiente"
  - No envía email aún
- [ ] Retorna: `{ id, estado, mensaje }`
- [ ] Retorna error 400 si fecha/hora no disponible

---

### **FASE 3: Backend - Gestión de Solicitudes**

#### ✅ TODO 6: Endpoint POST /api/solicitudes/:id/aprobar
**Descripción:** Aprobar una solicitud pendiente.

**Criterios de Aceptación:**
- [ ] Ruta: `POST /api/solicitudes/:id/aprobar`
- [ ] Requiere autenticación (solo usuarios de la app)
- [ ] Busca o crea `Paciente` basado en email/nombre de la solicitud
- [ ] Crea `Cita` con los datos de la solicitud
- [ ] Actualiza solicitud: `estado="aprobada"`, `citaId=idCita`, `pacienteId=idPaciente`
- [ ] Envía email de confirmación al cliente con:
  - Fecha y hora de la cita
  - Tipo de servicio
  - Datos de contacto de la farmacia
- [ ] Crea/actualiza notificación relacionada
- [ ] Retorna la `Cita` creada

---

#### ✅ TODO 7: Endpoint POST /api/solicitudes/:id/rechazar
**Descripción:** Rechazar una solicitud pendiente.

**Criterios de Aceptación:**
- [ ] Ruta: `POST /api/solicitudes/:id/rechazar`
- [ ] Requiere autenticación
- [ ] Actualiza solicitud: `estado="rechazada"`
- [ ] Opcional: envía email al cliente informando del rechazo
- [ ] Marca notificación como leída
- [ ] Retorna confirmación

---

#### ✅ TODO 8: Endpoint GET /api/solicitudes
**Descripción:** Listar solicitudes (pendientes, aprobadas, rechazadas).

**Criterios de Aceptación:**
- [ ] Ruta: `GET /api/solicitudes?estado=pendiente`
- [ ] Requiere autenticación
- [ ] Filtro opcional por `estado`
- [ ] Ordenado por `createdAt` descendente
- [ ] Retorna array de solicitudes con datos del cliente

---

### **FASE 4: Backend - Configuración de Calendario**

#### ✅ TODO 9: Endpoint GET /api/configuracion/calendario
**Descripción:** Obtener configuración del calendario.

**Criterios de Aceptación:**
- [ ] Ruta: `GET /api/configuracion/calendario`
- [ ] Requiere autenticación
- [ ] Retorna configuración completa (horarios, bloqueos, auto-aceptar)

---

#### ✅ TODO 10: Endpoint PUT /api/configuracion/calendario
**Descripción:** Actualizar configuración del calendario.

**Criterios de Aceptación:**
- [ ] Ruta: `PUT /api/configuracion/calendario`
- [ ] Requiere autenticación
- [ ] Body: `{ horariosPorTipo?, fechasBloqueadas?, horasBloqueadas?, autoAceptar?, duracionPorTipo? }`
- [ ] Valida formato JSON de horarios
- [ ] Valida formato de fechas y horas
- [ ] Actualiza o crea configuración
- [ ] Retorna configuración actualizada

---

#### ✅ TODO 11: Endpoint POST /api/configuracion/calendario/bloquear
**Descripción:** Bloquear una fecha/hora específica.

**Criterios de Aceptación:**
- [ ] Ruta: `POST /api/configuracion/calendario/bloquear`
- [ ] Requiere autenticación
- [ ] Body: `{ fecha: "2026-01-20", hora?: "10:00" }`
- [ ] Si solo `fecha`: bloquea todo el día
- [ ] Si `fecha` + `hora`: bloquea solo esa hora
- [ ] Actualiza `fechasBloqueadas` o `horasBloqueadas` en configuración
- [ ] Retorna confirmación

---

#### ✅ TODO 12: Endpoint DELETE /api/configuracion/calendario/desbloquear
**Descripción:** Desbloquear una fecha/hora.

**Criterios de Aceptación:**
- [ ] Ruta: `DELETE /api/configuracion/calendario/desbloquear?fecha=2026-01-20&hora=10:00`
- [ ] Requiere autenticación
- [ ] Si solo `fecha`: desbloquea todo el día
- [ ] Si `fecha` + `hora`: desbloquea solo esa hora
- [ ] Retorna confirmación

---

### **FASE 5: Backend - Sistema de Emails**

#### ✅ TODO 13: Servicio de Envío de Emails
**Descripción:** Configurar y enviar emails de confirmación.

**Criterios de Aceptación:**
- [ ] Instalar librería de email (ej: `nodemailer` o servicio como SendGrid)
- [ ] Función `enviarConfirmacionCita(email, datosCita, datosFarmacia)`
- [ ] Email incluye:
  - Asunto: "Confirmación de cita - [Tipo de servicio]"
  - Fecha y hora de la cita
  - Tipo de servicio
  - Datos de contacto de la farmacia (nombre, dirección, teléfono)
  - Instrucciones o recordatorios
- [ ] Configuración de SMTP en variables de entorno o en BD
- [ ] Manejo de errores (no fallar si el email no se puede enviar)

---

### **FASE 6: Frontend - Página Pública de Solicitud**

#### ✅ TODO 14: Página /solicitar-cita (Pública)
**Descripción:** Página responsive para que clientes soliciten citas.

**Criterios de Aceptación:**
- [ ] Ruta: `/solicitar-cita` (sin autenticación)
- [ ] Diseño responsive (mobile-first)
- [ ] Pasos del formulario:
  1. Seleccionar tipo de servicio (dermo, bio, consulta, seguimiento)
  2. Seleccionar fecha (calendario con días disponibles marcados)
  3. Seleccionar hora (solo horas disponibles para ese día y tipo)
  4. Formulario de datos: nombre, email, teléfono, notas (opcional)
  5. Confirmación y envío
- [ ] Validación en tiempo real:
  - Al seleccionar tipo: carga disponibilidad y marca días disponibles
  - Al seleccionar fecha: muestra solo horas disponibles
  - Deshabilita días/horas ocupadas del mismo tipo
  - Deshabilita días/horas bloqueadas
  - Deshabilita días fuera de horarios configurados
- [ ] Muestra mensaje de éxito después de enviar
- [ ] Muestra mensaje si la solicitud fue auto-aprobada
- [ ] Diseño atractivo y profesional (colores corporativos)

---

#### ✅ TODO 15: Hook useDisponibilidad
**Descripción:** Hook React Query para obtener disponibilidad.

**Criterios de Aceptación:**
- [ ] Hook: `useDisponibilidad(tipo: string, fecha: string)`
- [ ] Llama a `/api/public/disponibilidad`
- [ ] Cachea resultados por 1 minuto
- [ ] Retorna: `{ disponible: boolean, horasDisponibles: string[], isLoading }`

---

#### ✅ TODO 16: Hook useSolicitarCita
**Descripción:** Hook para crear solicitud de cita.

**Criterios de Aceptación:**
- [ ] Hook: `useSolicitarCita()`
- [ ] Mutation que llama a `/api/public/solicitar-cita`
- [ ] Maneja estados de loading y error
- [ ] Muestra toast de éxito/error
- [ ] Retorna resultado con estado (pendiente/aprobada)

---

### **FASE 7: Frontend - Configuración de Calendario**

#### ✅ TODO 17: Página de Configuración - Tab Calendario
**Descripción:** Sección en Configuracion.tsx para gestionar calendario.

**Criterios de Aceptación:**
- [ ] Nuevo tab "Calendario" en página de configuración
- [ ] Tres sub-secciones:
  1. **Horarios por Servicio:**
     - Tabla o formulario para cada tipo (dermo, bio, consulta, seguimiento)
     - Selector de días de la semana (L, M, X, J, V, S, D)
     - Input de rango horario (ej: "09:00-14:00")
     - Botón "Guardar Horarios"
  2. **Bloqueos:**
     - Calendario para seleccionar fechas a bloquear
     - Lista de fechas bloqueadas con botón eliminar
     - Input para bloquear hora específica en fecha
  3. **Auto-aceptación:**
     - Switch para activar/desactivar
     - Descripción de cómo funciona
- [ ] Guarda cambios en backend
- [ ] Muestra mensaje de éxito al guardar

---

#### ✅ TODO 18: Componente HorariosPorServicio
**Descripción:** Componente para configurar horarios.

**Criterios de Aceptación:**
- [ ] Muestra formulario por cada tipo de servicio
- [ ] Permite seleccionar múltiples días
- [ ] Input de rango horario con validación (formato HH:mm-HH:mm)
- [ ] Botón para agregar múltiples rangos (ej: mañana y tarde)
- [ ] Botón eliminar rango
- [ ] Vista previa de horarios configurados
- [ ] Guarda en formato JSON: `{ "dermo": { "lunes": ["09:00-14:00", "16:00-19:00"], ... } }`

---

#### ✅ TODO 19: Componente GestionarBloqueos
**Descripción:** Componente para bloquear/desbloquear fechas.

**Criterios de Aceptación:**
- [ ] Calendario visual para seleccionar fechas
- [ ] Lista de fechas bloqueadas con:
  - Fecha formateada
  - Horas bloqueadas (si aplica)
  - Botón eliminar bloqueo
- [ ] Modal o formulario para bloquear hora específica
- [ ] Muestra días bloqueados en el calendario con color diferente
- [ ] Botones "Bloquear Día" y "Desbloquear Día"

---

### **FASE 8: Frontend - Gestión de Solicitudes**

#### ✅ TODO 20: Vista de Solicitudes en Notificaciones
**Descripción:** Mostrar y gestionar solicitudes pendientes.

**Criterios de Aceptación:**
- [ ] En página de Notificaciones, mostrar solicitudes pendientes
- [ ] Cada solicitud muestra:
  - Nombre del cliente
  - Tipo de servicio
  - Fecha y hora solicitada
  - Email y teléfono
  - Notas (si las hay)
  - Botones "Aprobar" y "Rechazar"
- [ ] Al aprobar:
  - Muestra confirmación
  - Actualiza estado en tiempo real
  - Envía email automáticamente
- [ ] Al rechazar:
  - Muestra confirmación
  - Opcional: permite agregar motivo
- [ ] Filtro por estado (pendientes, aprobadas, rechazadas)

---

#### ✅ TODO 21: Hook useSolicitudes
**Descripción:** Hook para gestionar solicitudes.

**Criterios de Aceptación:**
- [ ] `useSolicitudes(estado?: string)` - lista solicitudes
- [ ] `useAprobarSolicitud()` - mutation para aprobar
- [ ] `useRechazarSolicitud()` - mutation para rechazar
- [ ] Invalidan queries después de mutaciones
- [ ] Manejan estados de loading y error

---

### **FASE 9: Frontend - Calendario Interno Mejorado**

#### ✅ TODO 22: Conectar Calendario.tsx con API Real
**Descripción:** Reemplazar datos de ejemplo con datos reales.

**Criterios de Aceptación:**
- [ ] Usa `useCitas()` para cargar citas reales
- [ ] Usa `useCrearCita()` para crear nuevas citas
- [ ] Usa `useEliminarCita()` para eliminar citas
- [ ] Selector de pacientes real (desde `usePacientes()`)
- [ ] Muestra citas en el calendario con colores por tipo
- [ ] Marca días con citas en el calendario
- [ ] Lista de citas del día seleccionado con datos reales
- [ ] Botón editar cita (abre modal con datos pre-rellenados)
- [ ] Botón eliminar cita (con confirmación)

---

#### ✅ TODO 23: Vista de Calendario Mejorada
**Descripción:** Mejorar UI del calendario interno.

**Criterios de Aceptación:**
- [ ] Vista mensual con citas marcadas
- [ ] Colores diferentes por tipo:
  - Dermo: Azul
  - Bio: Verde
  - Consulta: Morado
  - Seguimiento: Amarillo
- [ ] Tooltip al hover sobre día con resumen de citas
- [ ] Vista semanal opcional (toggle)
- [ ] Filtro por tipo de servicio
- [ ] Búsqueda por nombre de paciente
- [ ] Botón "Hoy" para volver a fecha actual

---

### **FASE 10: Testing y Validaciones**

#### ✅ TODO 24: Validaciones de Disponibilidad
**Criterios de Aceptación:**
- [ ] No permite seleccionar fecha/hora si ya hay cita del mismo tipo
- [ ] No permite seleccionar fecha bloqueada
- [ ] No permite seleccionar hora bloqueada
- [ ] No permite seleccionar fuera de horarios configurados
- [ ] Respeta duración del servicio (no solapa citas)
- [ ] Muestra mensajes claros cuando una opción no está disponible

---

#### ✅ TODO 25: Testing End-to-End
**Criterios de Aceptación:**
- [ ] Flujo completo: Cliente solicita → Admin aprueba → Email enviado
- [ ] Flujo auto-aceptación: Cliente solicita → Auto-aprobada → Email enviado
- [ ] Bloqueo de fecha funciona correctamente
- [ ] Configuración de horarios se respeta
- [ ] Responsive funciona en móvil
- [ ] Validaciones funcionan en tiempo real

---

## 🎯 Priorización Sugerida

1. **Fase 1-2** (Backend básico): Modelos, disponibilidad, endpoints públicos
2. **Fase 6** (Página pública): Lo más visible para el cliente
3. **Fase 3-5** (Gestión y emails): Aprobar solicitudes y confirmaciones
4. **Fase 7** (Configuración): Horarios y bloqueos
5. **Fase 8-9** (Mejoras): Gestión interna y calendario mejorado

---

## 📝 Notas Técnicas

- **Email:** Considerar usar servicio como SendGrid, Mailgun, o nodemailer con SMTP
- **Validación de disponibilidad:** Debe ser eficiente (índices en BD)
- **Página pública:** Sin autenticación, pero con rate limiting opcional
- **Responsive:** Mobile-first, probar en diferentes tamaños de pantalla
- **Colores:** Usar colores corporativos de la farmacia (#79438f, #6495a8)
