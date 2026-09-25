import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuthContext } from "@/contexts/AuthContext";
import { useConfiguracion } from "@/hooks/useConfiguracion";

// Se avisa un minuto antes de cerrar, por si el farmacéutico sigue delante
const AVISO_MS = 60 * 1000;
// Eventos que cuentan como «estar usando la app»
const EVENTOS_ACTIVIDAD = ["pointerdown", "keydown", "wheel", "touchstart", "mousemove"] as const;

/**
 * Cierra la sesión tras unos minutos sin usar la app (Configuración →
 * Seguridad). El ordenador del mostrador suele quedarse encendido y a la
 * vista: así nadie puede ver fichas de pacientes con la sesión de otro.
 */
export function BloqueoInactividad() {
  const { data: config } = useConfiguracion();
  const { logout } = useAuthContext();
  const navigate = useNavigate();
  const minutos = config?.minutosInactividad ?? 15;
  const [avisando, setAvisando] = useState(false);
  const [segundosRestantes, setSegundosRestantes] = useState(60);
  const ultimaActividad = useRef(Date.now());

  const cerrarSesion = useCallback(async () => {
    setAvisando(false);
    await logout("inactividad");
    navigate("/login", { state: { mensaje: "Se ha cerrado la sesión por inactividad" } });
  }, [logout, navigate]);

  // Cualquier actividad reinicia la cuenta (salvo con el aviso ya abierto:
  // ahí hay que pulsar «Seguir trabajando» expresamente)
  useEffect(() => {
    if (!minutos) return;
    const marcar = () => {
      if (!avisando) ultimaActividad.current = Date.now();
    };
    EVENTOS_ACTIVIDAD.forEach((e) => window.addEventListener(e, marcar, { passive: true }));
    return () => EVENTOS_ACTIVIDAD.forEach((e) => window.removeEventListener(e, marcar));
  }, [minutos, avisando]);

  // Una comprobación por segundo es suficiente y no cuesta nada
  useEffect(() => {
    if (!minutos) return;
    const limite = minutos * 60 * 1000;
    const intervalo = setInterval(() => {
      const inactivo = Date.now() - ultimaActividad.current;
      if (inactivo >= limite) {
        void cerrarSesion();
      } else if (inactivo >= limite - AVISO_MS) {
        setAvisando(true);
        setSegundosRestantes(Math.ceil((limite - inactivo) / 1000));
      }
    }, 1000);
    return () => clearInterval(intervalo);
  }, [minutos, cerrarSesion]);

  const seguir = () => {
    ultimaActividad.current = Date.now();
    setAvisando(false);
  };

  return (
    <AlertDialog open={avisando}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Sigues ahí?</AlertDialogTitle>
          <AlertDialogDescription>
            Por seguridad, la sesión se cerrará en {segundosRestantes} segundos por inactividad. Lo que no hayas
            guardado se perderá.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="outline" onClick={() => void cerrarSesion()}>
            Cerrar sesión
          </Button>
          <Button onClick={seguir}>Seguir trabajando</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
