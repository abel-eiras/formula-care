/**
 * Parámetros bioquímicos y rangos de referencia por defecto.
 * Se usan para inicializar la configuración de una instalación nueva.
 */

export const PARAMETROS_BIO_CONFIG_DEFAULT = [
  { id: 'glucemia', label: 'Glucemia', unit: 'mg/dL', grupo: 'basicos', activo: true, orden: 1 },
  { id: 'systolic', label: 'Tensión Sistólica', unit: 'mmHg', grupo: 'basicos', activo: true, orden: 2 },
  { id: 'diastolic', label: 'Tensión Diastólica', unit: 'mmHg', grupo: 'basicos', activo: true, orden: 3 },
  { id: 'pulsaciones', label: 'Pulsaciones', unit: 'lpm', grupo: 'basicos', activo: true, orden: 4 },
  { id: 'cholesterol', label: 'Colesterol Total', unit: 'mg/dL', grupo: 'avanzados', activo: true, orden: 1 },
  { id: 'cholesterolHDL', label: 'Colesterol HDL', unit: 'mg/dL', grupo: 'avanzados', activo: true, orden: 2 },
  { id: 'cholesterolLDL', label: 'Colesterol LDL', unit: 'mg/dL', grupo: 'avanzados', activo: true, orden: 3 },
  { id: 'triglycerides', label: 'Triglicéridos', unit: 'mg/dL', grupo: 'avanzados', activo: true, orden: 4 },
  { id: 'hemoglobinaGlucosilada', label: 'Hemoglobina Glucosilada (HbA1c)', unit: '%', grupo: 'avanzados', activo: true, orden: 5 },
  { id: 'proteinaCReactiva', label: 'Proteína C Reactiva (PCR)', unit: 'mg/L', grupo: 'avanzados', activo: true, orden: 6 },
  { id: 'vitaminaD', label: 'Vitamina D', unit: 'ng/mL', grupo: 'avanzados', activo: true, orden: 7 },
  { id: 'ferritina', label: 'Ferritina', unit: 'ng/mL', grupo: 'avanzados', activo: true, orden: 8 },
  { id: 'weight', label: 'Peso', unit: 'kg', grupo: 'corporales', activo: true, orden: 1 },
  { id: 'height', label: 'Altura', unit: 'cm', grupo: 'corporales', activo: true, orden: 2 },
  { id: 'perimetroAbdominal', label: 'Perímetro Abdominal', unit: 'cm', grupo: 'corporales', activo: true, orden: 3 },
  { id: 'imc', label: 'IMC', unit: 'kg/m²', grupo: 'corporales', activo: true, orden: 4 },
];

export const PARAMETROS_REFERENCIA_DEFAULT: Record<string, {
  normalMin: number;
  normalMax: number;
  advertenciaMin?: number;
  advertenciaMax?: number;
  advertenciaMin2?: number;
  advertenciaMax2?: number;
  criticoMin?: number;
  criticoMax?: number;
  criticoMin2?: number;
  criticoMax2?: number;
}> = {
  glucemia: { normalMin: 70, normalMax: 100, advertenciaMin: 60, advertenciaMax: 125, criticoMin: 50, criticoMax: 180 },
  systolic: { normalMin: 90, normalMax: 120, advertenciaMax: 140, criticoMax: 180 },
  diastolic: { normalMin: 60, normalMax: 80, advertenciaMax: 90, criticoMax: 120 },
  pulsaciones: { normalMin: 60, normalMax: 100, advertenciaMin: 50, advertenciaMax: 110, criticoMin: 40, criticoMax: 130 },
  cholesterol: { normalMin: 0, normalMax: 200, advertenciaMax: 240, criticoMax: 280 },
  cholesterolHDL: { normalMin: 40, normalMax: 60 },
  cholesterolLDL: { normalMin: 0, normalMax: 100, advertenciaMax: 130, criticoMax: 160 },
  triglycerides: { normalMin: 0, normalMax: 150, advertenciaMax: 200, criticoMax: 500 },
  hemoglobinaGlucosilada: { normalMin: 4, normalMax: 5.7, advertenciaMax: 6.5, criticoMax: 8 },
  proteinaCReactiva: { normalMin: 0, normalMax: 1, advertenciaMax: 3, criticoMax: 10 },
  vitaminaD: { normalMin: 30, normalMax: 100, advertenciaMin: 20, criticoMin: 10 },
  ferritina: { normalMin: 30, normalMax: 300 },
  imc: { normalMin: 18.5, normalMax: 24.9, advertenciaMax: 30, criticoMax: 40 },
  perimetroAbdominal: { normalMin: 0, normalMax: 102 },
};
