import { useEffect, useState } from "react";
import Cal, { getCalApi } from "@calcom/embed-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface CalBookingWidgetProps {
  calLink: string;
  brandColor?: string;
  theme?: "light" | "dark" | "auto";
}

export default function CalBookingWidget({ 
  calLink, 
  brandColor = "#79438f",
  theme = "light" 
}: CalBookingWidgetProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async function () {
      try {
        const cal = await getCalApi();
        cal("ui", {
          theme,
          styles: {
            branding: {
              brandColor: brandColor,
            },
          },
        });
        setIsLoaded(true);
      } catch (err) {
        console.error("Error al cargar Cal.com:", err);
        setError("No se pudo cargar el sistema de reservas. Verifica la configuración.");
      }
    })();
  }, [brandColor, theme]);

  if (!calLink) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No se ha configurado el enlace de Cal.com. Ve a Configuración para configurarlo.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reservar Cita de Dermocosmética</CardTitle>
        <CardDescription>
          Selecciona una fecha y hora disponible para tu consulta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div 
          style={{ 
            width: "100%", 
            height: "600px", 
            overflow: "auto",
            minHeight: "400px"
          }}
          className="rounded-lg border"
        >
          <Cal
            calLink={calLink}
            style={{ width: "100%", height: "100%", overflow: "scroll" }}
            config={{ layout: "month_view" }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
