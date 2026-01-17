import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";

// Lazy loading de páginas para code splitting (mejora bundle size)
const Index = lazy(() => import("./pages/Index"));
const Pacientes = lazy(() => import("./pages/Pacientes"));
const PacienteDetalle = lazy(() => import("./pages/PacienteDetalle"));
const NuevoPaciente = lazy(() => import("./pages/NuevoPaciente"));
const ServicioDermo = lazy(() => import("./pages/ServicioDermo"));
const ServicioBio = lazy(() => import("./pages/ServicioBio"));
const Calendario = lazy(() => import("./pages/Calendario"));
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
        <MainLayout>
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/pacientes" element={<Pacientes />} />
              <Route path="/pacientes/nuevo" element={<NuevoPaciente />} />
              <Route path="/pacientes/:id" element={<PacienteDetalle />} />
              <Route path="/calendario" element={<Calendario />} />
              <Route path="/servicios/dermo" element={<ServicioDermo />} />
              <Route path="/servicios/bio" element={<ServicioBio />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </MainLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
