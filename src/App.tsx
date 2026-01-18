import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";

// Lazy loading de páginas para code splitting (mejora bundle size)
const Index = lazy(() => import("./pages/Index"));
const Pacientes = lazy(() => import("./pages/Pacientes"));
const PacienteDetalle = lazy(() => import("./pages/PacienteDetalle"));
const EditarPaciente = lazy(() => import("./pages/EditarPaciente"));
const NuevoPaciente = lazy(() => import("./pages/NuevoPaciente"));
const ServicioDermo = lazy(() => import("./pages/ServicioDermo"));
const ServicioDermoPrint = lazy(() => import("./pages/ServicioDermoPrint"));
const ServicioBio = lazy(() => import("./pages/ServicioBio"));
const ServicioBioPrint = lazy(() => import("./pages/ServicioBioPrint"));
const Configuracion = lazy(() => import("./pages/Configuracion"));
const Calendario = lazy(() => import("./pages/Calendario"));
const SolicitarCita = lazy(() => import("./pages/SolicitarCita"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos (antes cacheTime)
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Rutas públicas sin layout - deben ir antes */}
          <Route
            path="/solicitar-cita"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <SolicitarCita />
              </Suspense>
            }
          />
          {/* Rutas de impresión sin layout */}
          <Route
            path="/servicios/dermo/print"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <ServicioDermoPrint />
              </Suspense>
            }
          />
          <Route
            path="/servicios/bio/print"
            element={
              <Suspense fallback={<LoadingSpinner />}>
                <ServicioBioPrint />
              </Suspense>
            }
          />
          {/* Rutas con layout usando Outlet */}
          <Route
            path="/"
            element={
              <MainLayout>
                <Suspense fallback={<LoadingSpinner />}>
                  <Outlet />
                </Suspense>
              </MainLayout>
            }
          >
            <Route index element={<Index />} />
            <Route path="pacientes" element={<Pacientes />} />
            <Route path="pacientes/nuevo" element={<NuevoPaciente />} />
            <Route path="pacientes/:id" element={<PacienteDetalle />} />
            <Route path="pacientes/:id/editar" element={<EditarPaciente />} />
            <Route path="calendario" element={<Calendario />} />
            <Route path="servicios/dermo" element={<ServicioDermo />} />
            <Route path="servicios/bio" element={<ServicioBio />} />
            <Route path="configuracion" element={<Configuracion />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
