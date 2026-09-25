import { CircleHelp } from "lucide-react";
import { Link } from "react-router-dom";

/** Enlace pequeño al tema de ayuda que explica la pantalla actual */
export function EnlaceAyuda({ tema, texto = "Ayuda" }: { tema: string; texto?: string }) {
  return (
    <Link
      to={`/ayuda?tema=${tema}`}
      className="inline-flex items-center gap-1 text-sm font-normal text-muted-foreground hover:text-primary"
    >
      <CircleHelp className="h-4 w-4" />
      {texto}
    </Link>
  );
}
