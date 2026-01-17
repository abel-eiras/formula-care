import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import Index from "./pages/Index";
import Pacientes from "./pages/Pacientes";
import PacienteDetalle from "./pages/PacienteDetalle";
import NuevoPaciente from "./pages/NuevoPaciente";
import ServicioDermo from "./pages/ServicioDermo";
import ServicioBio from "./pages/ServicioBio";
import Calendario from "./pages/Calendario";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <MainLayout>
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
        </MainLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
