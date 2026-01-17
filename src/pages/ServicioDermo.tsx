import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Save, Sparkles, ClipboardList, TestTube, Pill } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const skinTypes = ["Normal", "Seca", "Grasa", "Mixta", "Sensible"];
const phototypes = ["I - Muy clara", "II - Clara", "III - Intermedia", "IV - Mate", "V - Morena", "VI - Oscura"];
const concerns = [
  { id: "acne", label: "Acné" },
  { id: "manchas", label: "Manchas" },
  { id: "arrugas", label: "Arrugas" },
  { id: "rojeces", label: "Rojeces" },
  { id: "deshidratacion", label: "Deshidratación" },
  { id: "poros", label: "Poros dilatados" },
  { id: "flacidez", label: "Flacidez" },
  { id: "ojeras", label: "Ojeras" },
];

export default function ServicioDermo() {
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    skinType: "",
    phototype: "",
    hydration: "",
    sebum: "",
    elasticity: "",
    spots: "",
    ph: "",
    treatment: "",
    cleaning: "",
    sunProtection: "",
    supplements: "",
  });

  const handleConcernChange = (concernId: string, checked: boolean) => {
    setSelectedConcerns(prev =>
      checked ? [...prev, concernId] : prev.filter(id => id !== concernId)
    );
  };

  const handleSave = () => {
    toast.success("Análisis dermocosmético guardado correctamente");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild className="gap-2 -ml-2">
            <Link to="/">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Análisis Dermocosmético
            </h1>
            <p className="text-muted-foreground">Evaluación completa de piel</p>
          </div>
        </div>
        <Button size="lg" onClick={handleSave} className="shadow-md gap-2">
          <Save className="h-5 w-5" />
          Guardar Análisis
        </Button>
      </div>

      {/* Form Accordion */}
      <Accordion type="multiple" defaultValue={["entrevista", "analisis", "plan"]} className="space-y-4">
        {/* Section 1: Interview */}
        <AccordionItem value="entrevista" className="border-none">
          <Card className="shadow-sm border-border/50 overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]>div]:text-secondary">
              <div className="flex items-center gap-3 text-lg font-semibold transition-colors">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <ClipboardList className="h-5 w-5 text-secondary" />
                </div>
                Sección 1: Entrevista
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="pt-2 pb-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="skinType">Tipo de Piel</Label>
                    <Select
                      value={formData.skinType}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, skinType: value }))}
                    >
                      <SelectTrigger id="skinType">
                        <SelectValue placeholder="Seleccionar tipo de piel" />
                      </SelectTrigger>
                      <SelectContent>
                        {skinTypes.map((type) => (
                          <SelectItem key={type} value={type.toLowerCase()}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phototype">Fototipo</Label>
                    <Select
                      value={formData.phototype}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, phototype: value }))}
                    >
                      <SelectTrigger id="phototype">
                        <SelectValue placeholder="Seleccionar fototipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {phototypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>Preocupaciones Principales</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {concerns.map((concern) => (
                      <div key={concern.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={concern.id}
                          checked={selectedConcerns.includes(concern.id)}
                          onCheckedChange={(checked) => handleConcernChange(concern.id, checked as boolean)}
                        />
                        <Label htmlFor={concern.id} className="text-sm font-normal cursor-pointer">
                          {concern.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Section 2: Analysis */}
        <AccordionItem value="analisis" className="border-none">
          <Card className="shadow-sm border-border/50 overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]>div]:text-secondary">
              <div className="flex items-center gap-3 text-lg font-semibold transition-colors">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <TestTube className="h-5 w-5 text-secondary" />
                </div>
                Sección 2: Análisis
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="pt-2 pb-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hydration">Hidratación</Label>
                    <div className="relative">
                      <Input
                        id="hydration"
                        type="number"
                        placeholder="0-100"
                        value={formData.hydration}
                        onChange={(e) => setFormData(prev => ({ ...prev, hydration: e.target.value }))}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sebum">Sebo</Label>
                    <div className="relative">
                      <Input
                        id="sebum"
                        type="number"
                        placeholder="0-100"
                        value={formData.sebum}
                        onChange={(e) => setFormData(prev => ({ ...prev, sebum: e.target.value }))}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="elasticity">Elasticidad</Label>
                    <div className="relative">
                      <Input
                        id="elasticity"
                        type="number"
                        placeholder="0-100"
                        value={formData.elasticity}
                        onChange={(e) => setFormData(prev => ({ ...prev, elasticity: e.target.value }))}
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="spots">Manchas</Label>
                    <div className="relative">
                      <Input
                        id="spots"
                        type="number"
                        placeholder="0-10"
                        value={formData.spots}
                        onChange={(e) => setFormData(prev => ({ ...prev, spots: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ph">pH</Label>
                    <div className="relative">
                      <Input
                        id="ph"
                        type="number"
                        step="0.1"
                        placeholder="4.5-6.5"
                        value={formData.ph}
                        onChange={(e) => setFormData(prev => ({ ...prev, ph: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>

        {/* Section 3: Action Plan */}
        <AccordionItem value="plan" className="border-none">
          <Card className="shadow-sm border-border/50 overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]>div]:text-secondary">
              <div className="flex items-center gap-3 text-lg font-semibold transition-colors">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <Pill className="h-5 w-5 text-secondary" />
                </div>
                Sección 3: Plan de Acción
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className="pt-2 pb-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="treatment">Tratamiento Recomendado</Label>
                    <Textarea
                      id="treatment"
                      placeholder="Describir el tratamiento recomendado..."
                      value={formData.treatment}
                      onChange={(e) => setFormData(prev => ({ ...prev, treatment: e.target.value }))}
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cleaning">Limpieza</Label>
                    <Textarea
                      id="cleaning"
                      placeholder="Rutina de limpieza recomendada..."
                      value={formData.cleaning}
                      onChange={(e) => setFormData(prev => ({ ...prev, cleaning: e.target.value }))}
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sunProtection">Protección Solar</Label>
                    <Textarea
                      id="sunProtection"
                      placeholder="Recomendaciones de protección solar..."
                      value={formData.sunProtection}
                      onChange={(e) => setFormData(prev => ({ ...prev, sunProtection: e.target.value }))}
                      className="min-h-[100px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplements">Suplementación Oral</Label>
                    <Textarea
                      id="supplements"
                      placeholder="Suplementos recomendados..."
                      value={formData.supplements}
                      onChange={(e) => setFormData(prev => ({ ...prev, supplements: e.target.value }))}
                      className="min-h-[100px]"
                    />
                  </div>
                </div>
              </CardContent>
            </AccordionContent>
          </Card>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
