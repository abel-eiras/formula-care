# Mejores Prácticas de React - Formula Care

> Basado en [Vercel Labs Agent Skills - React Best Practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices)
> 
> Este documento codifica más de 10 años de conocimiento sobre optimización de rendimiento en React, organizado en 8 categorías con niveles de prioridad.

---

## 📊 Prioridades

Las reglas están organizadas por prioridad de impacto en el rendimiento:

- **🔴 CRITICAL** - Impacto máximo, resolver primero
- **🟠 HIGH** - Alto impacto, importante
- **🟡 MEDIUM** - Impacto moderado
- **🟢 LOW** - Optimizaciones avanzadas

---

## 🔴 CRITICAL - Eliminar Waterfalls (Cascadas de Datos)

### Regla 1: Evitar `await` secuenciales innecesarios

**❌ Evitar:**
```typescript
// Waterfall: cada await espera al anterior
async function CargarDatosPaciente({ id }: { id: string }) {
  const paciente = await obtenerPaciente(id)        // Espera 200ms
  const analisis = await obtenerAnalisis(id)        // Espera 200ms (después del anterior)
  const citas = await obtenerCitas(id)              // Espera 200ms (después del anterior)
  // Total: 600ms
}
```

**✅ Preferir:**
```typescript
// Paralelo: todas las peticiones se hacen simultáneamente
async function CargarDatosPaciente({ id }: { id: string }) {
  const [paciente, analisis, citas] = await Promise.all([
    obtenerPaciente(id),
    obtenerAnalisis(id),
    obtenerCitas(id)
  ])
  // Total: 200ms (el más lento)
}
```

### Regla 2: Fetch en paralelo cuando sea posible

**❌ Evitar:**
```typescript
function PacienteDetalle({ id }: { id: string }) {
  const { data: paciente } = useQuery(['paciente', id], () => obtenerPaciente(id))
  const pacienteId = paciente?.id
  
  // Este query espera a que el anterior termine
  const { data: analisis } = useQuery(
    ['analisis', pacienteId], 
    () => obtenerAnalisis(pacienteId!),
    { enabled: !!pacienteId }  // ❌ Waterfall
  )
}
```

**✅ Preferir:**
```typescript
function PacienteDetalle({ id }: { id: string }) {
  // Ambos queries se ejecutan en paralelo
  const { data: paciente } = useQuery(['paciente', id], () => obtenerPaciente(id))
  const { data: analisis } = useQuery(['analisis', id], () => obtenerAnalisis(id))
}
```

---

## 🔴 CRITICAL - Reducción de Bundle Size

### Regla 3: Evitar imports pesados en el cliente

**❌ Evitar:**
```typescript
// Importa toda la librería
import * as recharts from 'recharts'

function Grafico() {
  return <recharts.LineChart>...</recharts.LineChart>
}
```

**✅ Preferir:**
```typescript
// Importa solo lo necesario
import { LineChart, Line, XAxis, YAxis } from 'recharts'

function Grafico() {
  return <LineChart>...</LineChart>
}
```

### Regla 4: Code splitting para rutas

**✅ Implementar:**
```typescript
// En App.tsx - Lazy loading de páginas
import { lazy, Suspense } from 'react'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Pacientes = lazy(() => import('./pages/Pacientes'))
const Calendario = lazy(() => import('./pages/Calendario'))

function App() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/pacientes" element={<Pacientes />} />
        <Route path="/calendario" element={<Calendario />} />
      </Routes>
    </Suspense>
  )
}
```

### Regla 5: Evitar importar todo de librerías grandes

**❌ Evitar:**
```typescript
import _ from 'lodash'  // Importa toda la librería (70KB+)
const resultado = _.debounce(funcion, 300)
```

**✅ Preferir:**
```typescript
import debounce from 'lodash/debounce'  // Solo importa lo necesario
const resultado = debounce(funcion, 300)
```

---

## 🟠 HIGH - Optimización de Re-renders

### Regla 6: Usar React.memo para componentes que reciben props estables

**❌ Evitar:**
```typescript
// Se re-renderiza cada vez que el padre se actualiza
function PacienteCard({ paciente, onVerDetalle }: Props) {
  return <Card>...</Card>
}
```

**✅ Preferir:**
```typescript
// Solo se re-renderiza si las props cambian
const PacienteCard = React.memo(function PacienteCard({ 
  paciente, 
  onVerDetalle 
}: Props) {
  return <Card>...</Card>
})
```

### Regla 7: Memoizar callbacks con useCallback

**❌ Evitar:**
```typescript
function ListaPacientes({ pacientes }: Props) {
  // Se crea una nueva función en cada render
  const handleClick = (id: string) => {
    navegar(`/pacientes/${id}`)
  }
  
  return pacientes.map(p => (
    <PacienteCard 
      key={p.id} 
      paciente={p} 
      onClick={handleClick}  // Nueva función cada vez
    />
  ))
}
```

**✅ Preferir:**
```typescript
function ListaPacientes({ pacientes }: Props) {
  // Función memoizada, solo cambia si cambian las dependencias
  const handleClick = useCallback((id: string) => {
    navegar(`/pacientes/${id}`)
  }, [navegar])
  
  return pacientes.map(p => (
    <PacienteCard 
      key={p.id} 
      paciente={p} 
      onClick={handleClick}
    />
  ))
}
```

### Regla 8: Memoizar valores calculados con useMemo

**❌ Evitar:**
```typescript
function Dashboard({ pacientes }: Props) {
  // Se recalcula en cada render
  const pacientesActivos = pacientes.filter(p => p.activo)
  const total = pacientesActivos.reduce((sum, p) => sum + p.total, 0)
  
  return <div>Total: {total}</div>
}
```

**✅ Preferir:**
```typescript
function Dashboard({ pacientes }: Props) {
  // Solo se recalcula si cambia el array de pacientes
  const total = useMemo(() => {
    const activos = pacientes.filter(p => p.activo)
    return activos.reduce((sum, p) => sum + p.total, 0)
  }, [pacientes])
  
  return <div>Total: {total}</div>
}
```

**⚠️ Nota:** No abuses de `useMemo` y `useCallback`. Solo úsalos cuando:
- El cálculo es costoso
- El valor se pasa como prop a componentes memoizados
- Hay evidencia de problemas de rendimiento

---

## 🟠 HIGH - Optimización de Data Fetching

### Regla 9: Usar React Query para caching y sincronización

**✅ Implementar:**
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Query con cache automático
function usePacientes() {
  return useQuery({
    queryKey: ['pacientes'],
    queryFn: () => api.get('/pacientes').then(res => res.data),
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000, // 10 minutos
  })
}

// Mutation que invalida cache
function useCrearPaciente() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (nuevoPaciente: Paciente) => 
      api.post('/pacientes', nuevoPaciente),
    onSuccess: () => {
      // Invalidar y refrescar la lista
      queryClient.invalidateQueries({ queryKey: ['pacientes'] })
    }
  })
}
```

### Regla 10: Prefetch de datos cuando sea posible

**✅ Implementar:**
```typescript
function PacienteCard({ paciente }: { paciente: Paciente }) {
  const queryClient = useQueryClient()
  
  const handleHover = () => {
    // Prefetch cuando el usuario pasa el mouse
    queryClient.prefetchQuery({
      queryKey: ['paciente', paciente.id],
      queryFn: () => obtenerPacienteDetalle(paciente.id)
    })
  }
  
  return <Card onMouseEnter={handleHover}>...</Card>
}
```

---

## 🟡 MEDIUM - Optimización de Rendering

### Regla 11: Virtualización para listas largas

**✅ Para listas de 100+ items:**
```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

function ListaPacientes({ pacientes }: { pacientes: Paciente[] }) {
  const parentRef = useRef<HTMLDivElement>(null)
  
  const virtualizer = useVirtualizer({
    count: pacientes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Altura estimada de cada item
  })
  
  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(virtualItem => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <PacienteCard paciente={pacientes[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Regla 12: Minimizar Layout Shifts (CLS)

**❌ Evitar:**
```typescript
function PacienteCard({ paciente }: Props) {
  return (
    <Card>
      <img src={paciente.foto} />  {/* Sin dimensiones, causa layout shift */}
      <h2>{paciente.nombre}</h2>
    </Card>
  )
}
```

**✅ Preferir:**
```typescript
function PacienteCard({ paciente }: Props) {
  return (
    <Card>
      <img 
        src={paciente.foto} 
        width={200} 
        height={200}
        style={{ aspectRatio: '1/1' }}
        alt={paciente.nombre}
      />
      <h2>{paciente.nombre}</h2>
    </Card>
  )
}
```

### Regla 13: Lazy loading de imágenes

**✅ Implementar:**
```typescript
function ImagenPaciente({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"  // Carga diferida
      decoding="async" // Decodificación asíncrona
    />
  )
}
```

---

## 🟡 MEDIUM - Optimización de Componentes

### Regla 14: Extraer lógica de componentes grandes

**❌ Evitar:**
```typescript
// Componente de 500 líneas haciendo todo
function Dashboard() {
  // 100 líneas de lógica
  // 200 líneas de JSX
  // 100 líneas de efectos
  // 100 líneas de handlers
}
```

**✅ Preferir:**
```typescript
// Componente principal simple
function Dashboard() {
  const estadisticas = useEstadisticas()
  const pacientesRecientes = usePacientesRecientes()
  
  return (
    <div>
      <EstadisticasGrid datos={estadisticas} />
      <PacientesRecientes pacientes={pacientesRecientes} />
      <GraficoEvolucion />
    </div>
  )
}

// Componentes más pequeños y enfocados
function EstadisticasGrid({ datos }: Props) { ... }
function PacientesRecientes({ pacientes }: Props) { ... }
function GraficoEvolucion() { ... }
```

### Regla 15: Usar custom hooks para lógica reutilizable

**✅ Implementar:**
```typescript
// hooks/usePacientes.ts
export function usePacientes() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['pacientes'],
    queryFn: obtenerPacientes
  })
  
  const crearPaciente = useMutation({
    mutationFn: api.crearPaciente,
    onSuccess: () => queryClient.invalidateQueries(['pacientes'])
  })
  
  return {
    pacientes: data ?? [],
    isLoading,
    error,
    crearPaciente: crearPaciente.mutate
  }
}

// Uso en componentes
function Pacientes() {
  const { pacientes, isLoading, crearPaciente } = usePacientes()
  // ...
}
```

---

## 🟢 LOW - Optimizaciones Avanzadas

### Regla 16: Evitar crear objetos/arrays en el render

**❌ Evitar:**
```typescript
function Componente({ items }: Props) {
  // Nuevo array en cada render
  const filtrados = items.filter(i => i.activo)
  
  // Nuevo objeto en cada render
  const estilo = { color: 'red', fontSize: 16 }
  
  return <div style={estilo}>{filtrados.map(...)}</div>
}
```

**✅ Preferir:**
```typescript
function Componente({ items }: Props) {
  // Memoizar si es costoso
  const filtrados = useMemo(() => 
    items.filter(i => i.activo), 
    [items]
  )
  
  // Estilos constantes fuera del componente
  const estilo = { color: 'red', fontSize: 16 }
  
  return <div style={estilo}>{filtrados.map(...)}</div>
}
```

### Regla 17: Usar keys estables en listas

**❌ Evitar:**
```typescript
// Key basada en índice (puede causar bugs)
{pacientes.map((p, index) => (
  <PacienteCard key={index} paciente={p} />
))}
```

**✅ Preferir:**
```typescript
// Key única y estable
{pacientes.map(paciente => (
  <PacienteCard key={paciente.id} paciente={paciente} />
))}
```

---

## 📋 Checklist de Revisión

Antes de hacer commit de un componente React, revisa:

### Rendimiento
- [ ] ¿Hay waterfalls de datos? (await secuenciales innecesarios)
- [ ] ¿Se están importando librerías completas cuando solo se necesita una parte?
- [ ] ¿Los componentes pesados están usando code splitting?
- [ ] ¿Se están memoizando valores/callbacks costosos?

### Re-renders
- [ ] ¿Los componentes que reciben props estables usan React.memo?
- [ ] ¿Los callbacks están memoizados con useCallback?
- [ ] ¿Los valores calculados están memoizados con useMemo?

### Data Fetching
- [ ] ¿Se está usando React Query para caching?
- [ ] ¿Las mutations invalidan el cache correctamente?
- [ ] ¿Hay prefetch cuando es apropiado?

### UX
- [ ] ¿Las imágenes tienen dimensiones para evitar layout shifts?
- [ ] ¿Las listas largas están virtualizadas?
- [ ] ¿Hay loading states apropiados?

---

## 🔗 Referencias

- [Vercel Labs Agent Skills - React Best Practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices)
- [React Query Documentation](https://tanstack.com/query/latest)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)

---

## 💡 Nota Importante

**No optimices prematuramente.** Estas reglas son guías, pero:
1. Primero, haz que funcione
2. Luego, mide el rendimiento
3. Finalmente, optimiza donde sea necesario

La mayoría de problemas de rendimiento vienen de:
- Waterfalls de datos (CRITICAL)
- Bundle size excesivo (CRITICAL)
- Re-renders innecesarios (HIGH)

Enfócate en estos primero antes de micro-optimizaciones.
