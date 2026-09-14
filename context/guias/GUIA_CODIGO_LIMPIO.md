# Guía de Código Limpio - Formula Care

## 🎯 Principios Fundamentales

### 1. Legibilidad sobre Código Inteligente
**❌ Evitar:**
```typescript
const r = p.filter(x => x.s > 0).map(x => ({ n: x.n, v: x.v * 1.21 }))
```

**✅ Preferir:**
```typescript
// Filtrar pacientes activos y calcular precio con IVA
const pacientesActivos = pacientes.filter(paciente => paciente.activo === true)
const preciosConIva = pacientesActivos.map(paciente => ({
  nombre: paciente.nombre,
  precio: paciente.precio * 1.21
}))
```

### 2. Funciones Pequeñas y Enfocadas
**❌ Evitar:**
```typescript
function procesarPaciente(paciente: any) {
  // 100 líneas de código haciendo múltiples cosas
  if (paciente) {
    // validar
    // transformar
    // guardar
    // enviar email
    // actualizar dashboard
  }
}
```

**✅ Preferir:**
```typescript
/**
 * Valida los datos de un paciente antes de guardarlo
 * @param paciente - Datos del paciente a validar
 * @returns true si es válido, false en caso contrario
 */
function validarPaciente(paciente: Paciente): boolean {
  if (!paciente.nombre || paciente.nombre.trim().length === 0) {
    return false
  }
  if (!paciente.telefono || !esTelefonoValido(paciente.telefono)) {
    return false
  }
  return true
}

/**
 * Guarda un paciente en la base de datos
 */
async function guardarPaciente(paciente: Paciente): Promise<Paciente> {
  // Lógica de guardado
}

// Uso: funciones pequeñas que se combinan
if (validarPaciente(paciente)) {
  await guardarPaciente(paciente)
}
```

### 3. Nombres Descriptivos
**❌ Evitar:**
```typescript
const d = new Date()
const u = getUsers()
const p = u.find(x => x.id === id)
```

**✅ Preferir:**
```typescript
const fechaActual = new Date()
const usuarios = obtenerUsuarios()
const pacienteEncontrado = usuarios.find(usuario => usuario.id === idPaciente)
```

### 4. Comentarios Útiles
**❌ Evitar comentarios obvios:**
```typescript
// Incrementar contador
contador++
```

**✅ Comentar el "por qué", no el "qué":**
```typescript
// Usamos Math.floor en lugar de Math.round porque los análisis
// se registran a las horas en punto (10:00, 11:00, etc.)
// y no queremos redondear hacia arriba
const horaRedondeada = Math.floor(horaActual)
```

### 5. Evitar Magic Numbers
**❌ Evitar:**
```typescript
if (imc > 25) {
  // ...
}
```

**✅ Preferir:**
```typescript
// Límite superior de IMC normal según OMS
const IMC_LIMITE_NORMAL = 25

if (imc > IMC_LIMITE_NORMAL) {
  // ...
}
```

---

## 📁 Estructura de Archivos

### Componentes React

**Estructura recomendada:**
```
components/
├── pacientes/
│   ├── PacienteCard.tsx          # Componente específico
│   ├── PacienteCard.test.tsx     # Tests (si son necesarios)
│   └── index.ts                  # Exportaciones
├── servicios/
│   ├── FormularioDermo.tsx
│   └── FormularioBio.tsx
└── ui/                           # Componentes base reutilizables
    ├── button.tsx
    └── input.tsx
```

**Ejemplo de componente limpio:**
```typescript
/**
 * Tarjeta que muestra información resumida de un paciente
 * 
 * @param paciente - Datos del paciente a mostrar
 * @param onVerDetalle - Callback cuando se hace clic en "Ver detalle"
 */
interface PacienteCardProps {
  paciente: Paciente
  onVerDetalle: (id: string) => void
}

export function PacienteCard({ paciente, onVerDetalle }: PacienteCardProps) {
  const iniciales = obtenerIniciales(paciente.nombre)
  
  return (
    <Card>
      <CardHeader>
        <Avatar>
          <AvatarFallback>{iniciales}</AvatarFallback>
        </Avatar>
        <CardTitle>{paciente.nombre}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{paciente.telefono}</p>
        <Button onClick={() => onVerDetalle(paciente.id)}>
          Ver Detalle
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * Extrae las iniciales del nombre completo
 * Ejemplo: "María García López" -> "MGL"
 */
function obtenerIniciales(nombre: string): string {
  return nombre
    .split(' ')
    .map(palabra => palabra[0])
    .join('')
    .toUpperCase()
}
```

---

## 🔧 Backend - Estructura de API

### Rutas Limpias

**Ejemplo de ruta bien estructurada:**
```typescript
// routes/pacientes.ts

import { Router } from 'express'
import { obtenerPacientes, crearPaciente, obtenerPacientePorId } from '../controllers/pacientes'
import { validarPaciente } from '../middleware/validacion'
import { autenticar } from '../middleware/auth'

const router = Router()

// Todas las rutas requieren autenticación
router.use(autenticar)

// GET /api/pacientes - Obtener lista de pacientes
router.get('/', obtenerPacientes)

// GET /api/pacientes/:id - Obtener un paciente específico
router.get('/:id', obtenerPacientePorId)

// POST /api/pacientes - Crear nuevo paciente
router.post('/', validarPaciente, crearPaciente)

export default router
```

### Controladores Simples

```typescript
// controllers/pacientes.ts

import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'

/**
 * Obtiene la lista de todos los pacientes
 * Soporta búsqueda por query parameter ?busqueda=...
 */
export async function obtenerPacientes(req: Request, res: Response) {
  try {
    const { busqueda } = req.query
    
    const pacientes = await prisma.paciente.findMany({
      where: busqueda ? {
        OR: [
          { nombre: { contains: busqueda as string, mode: 'insensitive' } },
          { telefono: { contains: busqueda as string } }
        ]
      } : undefined,
      orderBy: { fechaCreacion: 'desc' }
    })
    
    res.json(pacientes)
  } catch (error) {
    console.error('Error al obtener pacientes:', error)
    res.status(500).json({ error: 'Error al obtener pacientes' })
  }
}

/**
 * Crea un nuevo paciente en la base de datos
 */
export async function crearPaciente(req: Request, res: Response) {
  try {
    const datosPaciente = req.body
    
    const paciente = await prisma.paciente.create({
      data: datosPaciente
    })
    
    res.status(201).json(paciente)
  } catch (error) {
    console.error('Error al crear paciente:', error)
    res.status(500).json({ error: 'Error al crear paciente' })
  }
}
```

---

## 📝 Ejemplo de Código Completo

### Frontend - Hook Personalizado

```typescript
// hooks/usePacientes.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Paciente } from '@/types'

/**
 * Hook para gestionar la lista de pacientes
 * Proporciona funciones para obtener, crear y actualizar pacientes
 */
export function usePacientes() {
  const queryClient = useQueryClient()
  
  // Obtener lista de pacientes
  const { data: pacientes, isLoading, error } = useQuery({
    queryKey: ['pacientes'],
    queryFn: async () => {
      const response = await api.get<Paciente[]>('/pacientes')
      return response.data
    }
  })
  
  // Crear nuevo paciente
  const crearPaciente = useMutation({
    mutationFn: async (nuevoPaciente: Omit<Paciente, 'id'>) => {
      const response = await api.post<Paciente>('/pacientes', nuevoPaciente)
      return response.data
    },
    onSuccess: () => {
      // Invalidar la query para refrescar la lista
      queryClient.invalidateQueries({ queryKey: ['pacientes'] })
    }
  })
  
  return {
    pacientes: pacientes ?? [],
    isLoading,
    error,
    crearPaciente: crearPaciente.mutate
  }
}
```

### Backend - Validación

```typescript
// middleware/validacion.ts

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

/**
 * Esquema de validación para crear un paciente
 */
const esquemaPaciente = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  telefono: z.string().regex(/^[0-9\s]+$/, 'El teléfono solo puede contener números'),
  email: z.string().email('Email inválido').optional(),
  fechaNacimiento: z.string().optional()
})

/**
 * Middleware que valida los datos del paciente antes de procesarlos
 */
export function validarPaciente(req: Request, res: Response, next: NextFunction) {
  try {
    esquemaPaciente.parse(req.body)
    next()
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Datos inválidos',
        detalles: error.errors
      })
    } else {
      res.status(500).json({ error: 'Error de validación' })
    }
  }
}
```

---

## ✅ Checklist de Código Limpio

Antes de hacer commit, revisa:

- [ ] ¿Los nombres de variables/funciones son claros y descriptivos?
- [ ] ¿Las funciones hacen una sola cosa?
- [ ] ¿Hay comentarios explicando lógica compleja?
- [ ] ¿Se eliminó código comentado o no usado?
- [ ] ¿Los archivos están en la carpeta correcta?
- [ ] ¿Se siguen las convenciones del proyecto?
- [ ] ¿El código se puede entender sin explicación?

---

## 🚫 Errores Comunes a Evitar

1. **Funciones gigantes** - Si una función tiene más de 50 líneas, probablemente hace demasiado
2. **Variables con nombres genéricos** - `data`, `item`, `result` no dicen nada
3. **Comentarios obvios** - No comentes lo que el código ya dice claramente
4. **Código duplicado** - Si copias y pegas, probablemente necesitas una función
5. **Anidación excesiva** - Si tienes más de 3 niveles de anidación, simplifica
6. **Parámetros mágicos** - Usa constantes con nombres claros

---

## 📚 Recursos

- **Clean Code** - Robert C. Martin
- **Refactoring** - Martin Fowler
- **TypeScript Handbook** - https://www.typescriptlang.org/docs/

---

**Recuerda: El código se escribe una vez, pero se lee muchas veces. Haz que sea fácil de leer.**
