import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import SolicitarCita from '@/pages/SolicitarCita';
import LegalPublico from '@/pages/LegalPublico';
import CancelarCita from '@/pages/CancelarCita';

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
          <Route path="/cancelar/:token" element={<CancelarCita />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </QueryClientProvider>
  );
}
