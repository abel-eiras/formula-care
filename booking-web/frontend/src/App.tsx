import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import SolicitarCita from '@/pages/SolicitarCita';
import LegalPublico from '@/pages/LegalPublico';
import ConfirmarCita from '@/pages/ConfirmarCita';
import ModificarCita from '@/pages/ModificarCita';
import CancelarCita from '@/pages/CancelarCita';
import StaffLogin from '@/pages/staff/StaffLogin';
import StaffLayout from '@/pages/staff/StaffLayout';
import StaffInbox from '@/pages/staff/StaffInbox';
import StaffSettings from '@/pages/staff/StaffSettings';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<SolicitarCita />} />
          <Route path="/legal/:tipo" element={<LegalPublico />} />
          <Route path="/cita/confirmar/:token" element={<ConfirmarCita />} />
          <Route path="/cita/modificar/:token" element={<ModificarCita />} />
          <Route path="/cita/cancelar/:token" element={<CancelarCita />} />

          <Route path="/staff/login" element={<StaffLogin />} />
          <Route path="/staff" element={<StaffLayout />}>
            <Route index element={<StaffInbox />} />
            <Route path="solicitudes" element={<StaffInbox />} />
            <Route path="ajustes" element={<StaffSettings />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}
