---
name: react-codigo-limpio
description: Aplica estándares de código limpio y mejores prácticas de React en el proyecto Farmacia Pontevea. Usar al escribir o revisar código React/TypeScript, al refactorizar componentes, o cuando se mencionen waterfalls, bundle size, re-renders, código limpio o buenas prácticas.
---

# React y Código Limpio - Farmacia Pontevea

Este skill codifica las reglas de código limpio y las mejores prácticas de React que debe seguir el proyecto. Consulta también [context/guias/GUIA_CODIGO_LIMPIO.md](../../context/guias/GUIA_CODIGO_LIMPIO.md) y [context/guias/REACT_BEST_PRACTICES.md](../../context/guias/REACT_BEST_PRACTICES.md).

## Principios generales

- **KISS:** Mantener el código simple; evitar sobre-ingeniería.
- **Nombres en español** cuando sea legible (variables, funciones, comentarios).
- **Funciones pequeñas** con una sola responsabilidad.
- **TypeScript estricto:** Evitar `any`; usar tipos e interfaces explícitos.
- **Comentarios:** Explicar el "por qué", no el "qué"; documentar lógica compleja en español.

## Reglas CRÍTICAS (React)

### 1. Evitar waterfalls de datos

No encadenar `await` cuando las peticiones pueden hacerse en paralelo.

```typescript
// ❌ MAL
const paciente = await obtenerPaciente(id)
const analisis = await obtenerAnalisis(id)

// ✅ BIEN
const [paciente, analisis] = await Promise.all([
  obtenerPaciente(id),
  obtenerAnalisis(id)
])
```

En React Query, evitar que un query dependa de otro cuando ambos pueden usar el mismo identificador (ej. `id`); ejecutar ambos en paralelo.

### 2. Reducir bundle size

- Importar **solo lo necesario** de librerías grandes (p. ej. `import { LineChart, Line } from 'recharts'`, no `import * as recharts`).
- Usar **code splitting** para rutas: `const Dashboard = lazy(() => import('./pages/Dashboard'))` y envolver rutas en `<Suspense>`.

### 3. Code splitting en rutas

Las páginas deben cargarse bajo demanda con `lazy()` y un fallback de carga (p. ej. spinner).

## Reglas de ALTO impacto

- **React.memo** para componentes que reciben props estables y no necesitan re-renderizar siempre.
- **useCallback** para callbacks que se pasan a componentes memoizados o como dependencias.
- **useMemo** solo cuando el cálculo es costoso o el valor se pasa a componentes memoizados.
- **React Query** para datos del servidor: usar `useQuery`/`useMutation`, invalidar cache tras mutaciones, prefetch cuando sea útil.

## Reglas de código limpio

- Nombres descriptivos (no `d`, `u`, `p`, `data`, `item`).
- Evitar "magic numbers"; usar constantes con nombre.
- No funciones gigantes (objetivo: una responsabilidad por función).
- Comentar solo cuando aporte valor (por qué, no qué).

## Checklist rápido antes de commit

- [ ] ¿Hay waterfalls de datos?
- [ ] ¿Imports de librerías completas?
- [ ] ¿Rutas con lazy loading?
- [ ] ¿Uso adecuado de memo/useCallback/useMemo?
- [ ] ¿Nombres claros y en español cuando aplique?
- [ ] ¿Evitado `any`?

## Referencias en el proyecto

- [context/guias/GUIA_CODIGO_LIMPIO.md](../../context/guias/GUIA_CODIGO_LIMPIO.md) – Estándares detallados y ejemplos.
- [context/guias/REACT_BEST_PRACTICES.md](../../context/guias/REACT_BEST_PRACTICES.md) – Prioridades y reglas de rendimiento React.
