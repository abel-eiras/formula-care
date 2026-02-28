# Guía para Agentes de IA - Farmacia Pontevea

> Este documento proporciona contexto y reglas para agentes de IA que trabajen en este proyecto.

## 📋 Información del Proyecto

**Nombre:** Farmacia Pontevea - Sistema de Gestión de Servicios  
**Stack Principal:** React 18 + TypeScript + Node.js + Express  
**Base de Datos:** Prisma ORM (SQLite/PostgreSQL)  
**UI Framework:** shadcn/ui + Tailwind CSS

## 🎯 Principios Fundamentales

### 1. Código Limpio y Simple
- Funciones pequeñas con un solo propósito
- Nombres descriptivos en español
- Evitar sobre-ingeniería
- KISS (Keep It Simple, Stupid)

### 2. Documentación en Español
- Todos los comentarios en español
- Explicar el "por qué", no el "qué"
- Documentar funciones complejas

### 3. TypeScript Estricto
- Evitar `any`
- Tipos explícitos
- Interfaces claras

## 📚 Documentos de Referencia

Toda la documentación de referencia está en la carpeta **context/**. Consulta:

- **[context/README.md](./context/README.md)** - Índice de documentación para agentes
- **[context/STACK.md](./context/STACK.md)** - Stack tecnológico y convenciones
- **[context/QUICKSTART.md](./context/QUICKSTART.md)** - Inicio rápido (comandos, verificación)
- **[context/guias/GUIA_CODIGO_LIMPIO.md](./context/guias/GUIA_CODIGO_LIMPIO.md)** - Estándares de código y ejemplos
- **[context/guias/ESTRUCTURA_PROYECTO.md](./context/guias/ESTRUCTURA_PROYECTO.md)** - Organización de carpetas y archivos
- **[context/guias/REACT_BEST_PRACTICES.md](./context/guias/REACT_BEST_PRACTICES.md)** - Mejores prácticas de React (Vercel Labs)
- **[context/guias/GUIA_DESPLIEGUE.md](./context/guias/GUIA_DESPLIEGUE.md)** - Despliegue en producción
- **Backend:** [backend/README.md](./backend/README.md) (API), [backend/EMAIL_CONFIG.md](./backend/EMAIL_CONFIG.md) (correo)

## 🔴 Reglas Críticas de React (Prioridad Máxima)

### Evitar Waterfalls de Datos
```typescript
// ❌ MAL: await secuencial
const paciente = await obtenerPaciente(id)
const analisis = await obtenerAnalisis(id)

// ✅ BIEN: Promise.all para paralelo
const [paciente, analisis] = await Promise.all([
  obtenerPaciente(id),
  obtenerAnalisis(id)
])
```

### Reducir Bundle Size
```typescript
// ❌ MAL: importar toda la librería
import * as recharts from 'recharts'

// ✅ BIEN: importar solo lo necesario
import { LineChart, Line } from 'recharts'
```

### Code Splitting para Rutas
```typescript
// ✅ Usar lazy loading
const Dashboard = lazy(() => import('./pages/Dashboard'))
```

## 🟠 Reglas de Alto Impacto

### Optimización de Re-renders
- Usar `React.memo` para componentes con props estables
- Memoizar callbacks con `useCallback`
- Memoizar valores calculados con `useMemo` (solo si es costoso)

### Data Fetching
- Usar React Query para caching
- Invalidar cache después de mutations
- Prefetch cuando sea apropiado

## 🟡 Reglas de Impacto Medio

### Rendering
- Virtualizar listas largas (100+ items)
- Minimizar layout shifts (CLS)
- Lazy loading de imágenes

### Componentes
- Extraer lógica de componentes grandes
- Usar custom hooks para lógica reutilizable

## 📁 Estructura de Carpetas

```
(raíz)
├── src/              # Frontend React (Vite)
│   ├── pages/        # Páginas (PascalCase)
│   ├── components/   # Componentes reutilizables (ui/, layout/, [feature]/)
│   ├── hooks/        # Custom hooks (camelCase con "use")
│   ├── lib/          # api.ts, utils.ts, etc.
│   └── types/        # TypeScript types
├── backend/          # API Node.js + Express + Prisma
├── context/          # Documentación para agentes (guías, old, integraciones)
└── .cursor/skills/   # Skills de proyecto (react-codigo-limpio, stack-farmacia-pontevea)
```

## 🧩 Skills de Proyecto

En **.cursor/skills/** hay skills específicos de este repositorio:

| Skill | Cuándo usarlo |
|-------|----------------|
| **react-codigo-limpio** | Al escribir o revisar código React/TypeScript; aplicar estándares de código limpio, evitar waterfalls, optimizar bundle y re-renders. |
| **stack-farmacia-pontevea** | Cuando necesites contexto del stack (React, Vite, Prisma, Express) o de la estructura del proyecto. |

## ✅ Checklist Antes de Commit

### React
- [ ] ¿Hay waterfalls de datos?
- [ ] ¿Se están importando librerías completas?
- [ ] ¿Los componentes pesados usan code splitting?
- [ ] ¿Se memoizan valores/callbacks costosos?

### Código
- [ ] ¿Los nombres son descriptivos?
- [ ] ¿Las funciones son pequeñas y enfocadas?
- [ ] ¿Hay comentarios explicando lógica compleja?
- [ ] ¿El código está en español?

### TypeScript
- [ ] ¿Se evita el uso de `any`?
- [ ] ¿Los tipos son explícitos?
- [ ] ¿Las interfaces están bien definidas?

## 🚫 Errores Comunes a Evitar

1. **Waterfalls de datos** - Usar `Promise.all` en lugar de `await` secuencial
2. **Imports pesados** - Importar solo lo necesario de librerías grandes
3. **Re-renders innecesarios** - Usar `React.memo`, `useCallback`, `useMemo` apropiadamente
4. **Bundle size grande** - Implementar code splitting
5. **Código sin comentar** - Comentar lógica compleja en español

## 🔗 Referencias Externas

- [Vercel Labs Agent Skills - React Best Practices](https://github.com/vercel-labs/agent-skills/tree/main/skills/react-best-practices)
- [React Query Documentation](https://tanstack.com/query/latest)
- [React Documentation](https://react.dev)

## 💡 Nota Importante

**No optimices prematuramente.** 

1. Primero, haz que funcione
2. Luego, mide el rendimiento
3. Finalmente, optimiza donde sea necesario

Enfócate primero en:
- Eliminar waterfalls (CRITICAL)
- Reducir bundle size (CRITICAL)
- Optimizar re-renders (HIGH)

Antes de micro-optimizaciones.

---

**Última actualización:** Febrero 2025
