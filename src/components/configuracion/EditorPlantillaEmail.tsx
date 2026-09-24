/**
 * Editor de Plantilla de Email con Preview
 * Permite editar el HTML y ver el resultado en tiempo real
 */

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Save, 
  RotateCcw, 
  Eye, 
  Code, 
  Copy, 
  Check,
  AlertTriangle,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';
import type { PlantillaEmail, VariablePlantilla, Configuracion } from '@/types';

interface EditorPlantillaEmailProps {
  plantilla: PlantillaEmail;
  variables: VariablePlantilla[];
  onSave: (datos: Partial<PlantillaEmail>) => Promise<void>;
  onRestore: () => Promise<void>;
  isLoading?: boolean;
  config?: Configuracion; // Configuración de la farmacia para el preview
}

// Genera datos de ejemplo para el preview usando la configuración real
const generarDatosPreview = (config?: Configuracion): Record<string, string> => ({
  nombrePaciente: 'María García López',
  fechaCita: 'viernes, 24 de enero de 2026',
  horaCita: '10:30',
  tipoServicio: 'Dermocosmética',
  nombreFarmacia: config?.farmaciaNombre || 'Tu Farmacia',
  direccionFarmacia: config?.farmaciaDireccion ? `${config.farmaciaDireccion}, ${config.farmaciaCiudad || ''}` : 'Dirección configurada',
  telefonoFarmacia: config?.farmaciaTelefono || 'Teléfono configurado',
  emailFarmacia: config?.farmaciaEmail || 'email@tufarmacia.com',
  webFarmacia: config?.farmaciaWeb || 'www.tufarmacia.com',
  urlCancelar: '#',
  urlSolicitarCita: '#',
  anioActual: new Date().getFullYear().toString(),
  motivoRechazo: 'Horario no disponible',
  colorPrimario: '#79438f',
  colorSecundario: '#6495a8',
  colorAcento: '#79438f',
  bloqueLogo: '',
  bloqueWhatsapp: '',
  bloqueTelefono: '',
  // Ejemplos de los bloques que el servidor genera según el caso
  bloqueCancelar:
    '<p style="font-size: 14px; color: #666;">¿No puedes venir? <a href="#">Cancela tu cita aquí</a> para que otra persona pueda aprovechar el hueco.</p>',
  bloqueSolicitarCita:
    '<a href="#" style="display: inline-block; background-color: #79438f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Solicitar nueva cita</a>',
  bloqueMotivo: '<p style="margin: 10px 0 0 0;"><strong>Motivo:</strong> Horario no disponible</p>',
});

export function EditorPlantillaEmail({
  plantilla,
  variables,
  onSave,
  onRestore,
  isLoading = false,
  config,
}: EditorPlantillaEmailProps) {
  // Datos de preview usando configuración real
  const DATOS_PREVIEW = useMemo(() => generarDatosPreview(config), [config]);
  const [asunto, setAsunto] = useState(plantilla.asunto);
  const [contenidoHtml, setContenidoHtml] = useState(plantilla.contenidoHtml);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);

  // Detectar si hay cambios sin guardar
  const hasChanges = useMemo(() => {
    return asunto !== plantilla.asunto || contenidoHtml !== plantilla.contenidoHtml;
  }, [asunto, contenidoHtml, plantilla]);

  // Reemplazar variables en el contenido para el preview y sanitizar para evitar XSS
  const contenidoPreview = useMemo(() => {
    let html = contenidoHtml;
    for (const [key, value] of Object.entries(DATOS_PREVIEW)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      html = html.replace(regex, value);
    }
    return DOMPurify.sanitize(html, { ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'span', 'div', 'table', 'tr', 'td', 'th', 'tbody', 'thead'] });
  }, [contenidoHtml, DATOS_PREVIEW]);

  const asuntoPreview = useMemo(() => {
    let texto = asunto;
    for (const [key, value] of Object.entries(DATOS_PREVIEW)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      texto = texto.replace(regex, value);
    }
    return texto;
  }, [asunto, DATOS_PREVIEW]);

  // Copiar variable al portapapeles e insertar en el cursor
  const handleCopyVariable = useCallback((nombre: string) => {
    const variable = `{{${nombre}}}`;
    navigator.clipboard.writeText(variable);
    setCopiedVariable(nombre);
    setTimeout(() => setCopiedVariable(null), 2000);
    toast.success(`Variable {{${nombre}}} copiada`);
  }, []);

  // Insertar variable en el textarea de HTML
  const handleInsertVariable = useCallback((nombre: string) => {
    const variable = `{{${nombre}}}`;
    setContenidoHtml(prev => prev + variable);
    toast.info(`Variable {{${nombre}}} insertada al final`);
  }, []);

  // Guardar cambios
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({ asunto, contenidoHtml });
      toast.success('Plantilla guardada correctamente');
    } catch (error) {
      toast.error('Error al guardar la plantilla');
    } finally {
      setIsSaving(false);
    }
  };

  // Restaurar por defecto
  const handleRestore = async () => {
    if (!confirm('¿Estás seguro de restaurar la plantilla a su valor por defecto? Se perderán los cambios personalizados.')) {
      return;
    }
    
    setIsRestoring(true);
    try {
      await onRestore();
      // Actualizar estado local con los nuevos valores
      setAsunto(plantilla.asunto);
      setContenidoHtml(plantilla.contenidoHtml);
      toast.success('Plantilla restaurada correctamente');
    } catch (error) {
      toast.error('Error al restaurar la plantilla');
    } finally {
      setIsRestoring(false);
    }
  };

  // Sincronizar cuando cambia la plantilla externa
  useState(() => {
    setAsunto(plantilla.asunto);
    setContenidoHtml(plantilla.contenidoHtml);
  });

  return (
    <div className="space-y-6">
      {/* Alerta de cambios sin guardar */}
      {hasChanges && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            Tienes cambios sin guardar. Recuerda guardar antes de salir.
          </AlertDescription>
        </Alert>
      )}

      {/* Información de la plantilla */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{plantilla.nombre}</h3>
          <p className="text-sm text-muted-foreground">
            Tipo: <Badge variant="outline">{plantilla.tipo}</Badge>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestore}
            disabled={isRestoring || isLoading}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restaurar
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving || isLoading}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </div>

      {/* Asunto */}
      <div className="space-y-2">
        <Label htmlFor="asunto">Asunto del email</Label>
        <Input
          id="asunto"
          value={asunto}
          onChange={(e) => setAsunto(e.target.value)}
          placeholder="Ej: Confirmación de cita - {{tipoServicio}}"
        />
        <p className="text-xs text-muted-foreground">
          Preview: <strong>{asuntoPreview}</strong>
        </p>
      </div>

      {/* Variables disponibles */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="h-4 w-4" />
            Variables disponibles
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex flex-wrap gap-2">
            {variables.map((v) => (
              <Badge
                key={v.nombre}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/80 transition-colors"
                onClick={() => handleCopyVariable(v.nombre)}
                title={v.descripcion}
              >
                {copiedVariable === v.nombre ? (
                  <Check className="h-3 w-3 mr-1" />
                ) : (
                  <Copy className="h-3 w-3 mr-1" />
                )}
                {`{{${v.nombre}}}`}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Click en una variable para copiarla al portapapeles
          </p>
        </CardContent>
      </Card>

      {/* Editor y Preview */}
      <Tabs defaultValue="editor" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="editor" className="gap-2">
            <Code className="h-4 w-4" />
            Editor HTML
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-2">
            <Eye className="h-4 w-4" />
            Vista previa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="mt-4">
          <div className="space-y-2">
            <Label htmlFor="contenidoHtml">Contenido HTML</Label>
            <Textarea
              id="contenidoHtml"
              value={contenidoHtml}
              onChange={(e) => setContenidoHtml(e.target.value)}
              placeholder="<html>...</html>"
              className="font-mono text-sm min-h-[400px]"
            />
            <p className="text-xs text-muted-foreground">
              Puedes usar HTML completo con estilos inline para el diseño del email
            </p>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <Card>
            <CardHeader className="py-3 border-b">
              <div className="text-sm">
                <span className="text-muted-foreground">Asunto: </span>
                <strong>{asuntoPreview}</strong>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div 
                  className="p-4"
                  dangerouslySetInnerHTML={{ __html: contenidoPreview }}
                />
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
