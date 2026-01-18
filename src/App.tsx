import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";

// Lazy loading de páginas para code splitting (mejora bundle size)
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
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
const Legal = lazy(() => import("./pages/Legal"));
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
        <AuthProvider>
          <Routes>
            {/* Rutas públicas sin autenticación */}
            <Route
              path="/login"
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Login />
                </Suspense>
              }
            />
            <Route
              path="/solicitar-cita"
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <SolicitarCita />
                </Suspense>
              }
            />
            {/* Rutas legales públicas */}
            <Route
              path="/legal/:tipo"
              element={
                <Suspense fallback={<LoadingSpinner />}>
                  <Legal />
                </Suspense>
              }
            />
            {/* Rutas de impresión (protegidas) */}
            <Route
              path="/servicios/dermo/print"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingSpinner />}>
                    <ServicioDermoPrint />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            <Route
              path="/servicios/bio/print"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<LoadingSpinner />}>
                    <ServicioBioPrint />
                  </Suspense>
                </ProtectedRoute>
              }
            />
            {/* Rutas protegidas con layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Suspense fallback={<LoadingSpinner />}>
                      <Outlet />
                    </Suspense>
                  </MainLayout>
                </ProtectedRoute>
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
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
