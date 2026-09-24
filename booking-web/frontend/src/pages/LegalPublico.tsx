import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Building2, FileText, Shield, Cookie, Loader2 } from 'lucide-react';
import { useTextoLegal } from '@/hooks/useBooking';

const LEGAL_PAGES = {
  'aviso-legal': { title: 'Aviso Legal', icon: FileText },
  privacidad: { title: 'Política de Privacidad', icon: Shield },
  cookies: { title: 'Política de Cookies', icon: Cookie },
} as const;

type LegalPageType = keyof typeof LEGAL_PAGES;

export default function LegalPublico() {
  const { tipo } = useParams<{ tipo: string }>();
  const { data, isLoading, error } = useTextoLegal(tipo || null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tipo]);

  const pageConfig = tipo && tipo in LEGAL_PAGES ? LEGAL_PAGES[tipo as LegalPageType] : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pageConfig || error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Página no encontrada</h2>
            <p className="text-muted-foreground mb-4">El documento legal que buscas no existe.</p>
            <Button asChild>
              <Link to="/">Volver</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const Icon = pageConfig.icon;
  const nombreFarmacia = data.farmacia;
  const contenido = data.contenido;

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" asChild className="gap-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </Button>
        </div>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          {nombreFarmacia && <p className="text-sm text-muted-foreground">{nombreFarmacia}</p>}
        </div>

        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              {data.titulo}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {contenido ? (
              <div className="prose prose-sm max-w-none">
                {contenido.split('\n').map((linea, index) => {
                  const esTitulo = /^[0-9]+\./.test(linea.trim()) || (linea === linea.toUpperCase() && linea.trim().length > 0);
                  if (linea.trim() === '') return <br key={index} />;
                  if (esTitulo) {
                    return (
                      <h3 key={index} className="text-base font-semibold mt-6 mb-2">
                        {linea}
                      </h3>
                    );
                  }
                  return (
                    <p key={index} className="text-sm text-muted-foreground mb-2 leading-relaxed">
                      {linea}
                    </p>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Contenido no disponible</h3>
                <p className="text-muted-foreground text-sm">
                  Este documento legal aún no ha sido configurado.
                  <br />
                  Por favor, contacta con la farmacia para más información.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {nombreFarmacia}. Todos los derechos reservados.
          </p>
          <div className="flex justify-center gap-4 mt-2 text-xs">
            <Link to="/legal/aviso-legal" className="text-primary hover:underline">
              Aviso Legal
            </Link>
            <Link to="/legal/privacidad" className="text-primary hover:underline">
              Privacidad
            </Link>
            <Link to="/legal/cookies" className="text-primary hover:underline">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
