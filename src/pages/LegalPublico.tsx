/**
 * Página de textos legales públicos (sin autenticación)
 * Muestra los textos legales de una farmacia específica por su slug
 */

import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Building2, FileText, Shield, Cookie, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

// Tipo para la respuesta del API
interface TextoLegalResponse {
  farmacia: {
    slug: string;
    nombre: string;
  };
  tipo: string;
  titulo: string;
  contenido: string | null;
}

// Mapeo de tipos de página legal
const LEGAL_PAGES = {
  'aviso-legal': {
    title: 'Aviso Legal',
    icon: FileText,
  },
  'privacidad': {
    title: 'Política de Privacidad',
    icon: Shield,
  },
  'cookies': {
    title: 'Política de Cookies',
    icon: Cookie,
  },
} as const;

type LegalPageType = keyof typeof LEGAL_PAGES;

export default function LegalPublico() {
  const { slug, tipo } = useParams<{ slug: string; tipo: string }>();

  // Query para obtener el texto legal
  const { data, isLoading, error } = useQuery({
    queryKey: ['legal-publico', slug, tipo],
    queryFn: async () => {
      if (!slug || !tipo) return null;
      return api.get<TextoLegalResponse>(`/public/farmacia/${slug}/legal/${tipo}`);
    },
    enabled: !!slug && !!tipo,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Scroll al inicio cuando cambia la página
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tipo]);

  // Verificar que el tipo es válido
  const pageConfig = tipo && tipo in LEGAL_PAGES 
    ? LEGAL_PAGES[tipo as LegalPageType] 
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Página no encontrada o error
  if (!pageConfig || error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Página no encontrada</h2>
            <p className="text-muted-foreground mb-4">
              El documento legal que buscas no existe.
            </p>
            {slug && (
              <Button asChild>
                <Link to={`/cita/${slug}`}>Volver</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const Icon = pageConfig.icon;
  const nombreFarmacia = data.farmacia.nombre;
  const contenido = data.contenido;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" asChild className="gap-2">
            <Link to={`/cita/${slug}`}>
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </Button>
        </div>

        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">{nombreFarmacia}</p>
        </div>

        {/* Contenido */}
        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              {data.titulo}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {contenido ? (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {/* Renderizar el texto respetando saltos de línea */}
                {contenido.split('\n').map((linea, index) => {
                  // Detectar títulos (líneas en mayúsculas o que empiezan con número)
                  const esTitulo = /^[0-9]+\./.test(linea.trim()) || 
                                   (linea === linea.toUpperCase() && linea.trim().length > 0);
                  
                  if (linea.trim() === '') {
                    return <br key={index} />;
                  }
                  
                  if (esTitulo) {
                    return (
                      <h3 key={index} className="text-base font-semibold mt-6 mb-2 text-foreground">
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

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {nombreFarmacia}. Todos los derechos reservados.
          </p>
          <div className="flex justify-center gap-4 mt-2 text-xs">
            <Link to={`/f/${slug}/legal/aviso-legal`} className="text-primary hover:underline">
              Aviso Legal
            </Link>
            <Link to={`/f/${slug}/legal/privacidad`} className="text-primary hover:underline">
              Privacidad
            </Link>
            <Link to={`/f/${slug}/legal/cookies`} className="text-primary hover:underline">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
