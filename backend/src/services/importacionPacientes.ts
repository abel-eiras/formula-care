/**
 * Importación de pacientes desde la plantilla Excel que genera la propia app.
 *
 * La plantilla fija los encabezados (así sabemos leerlos) y ayuda a
 * rellenarla bien: desplegable para el sexo, fecha con formato de fecha y
 * teléfono como texto (Excel quita los ceros y los + de los números).
 * Solo se importan pacientes: las medidas no suelen poder exportarse de
 * ningún sitio y se registrarán en las visitas.
 */
import ExcelJS from 'exceljs';
import { prisma } from '../lib/prisma.js';
import { normalizarBusqueda, textoBusquedaPaciente } from '../lib/textoBusqueda.js';
import { crearPacienteSchema } from '../controllers/pacientes.js';
import { constanciaConsentimiento } from './rgpdService.js';

type CampoPaciente = 'name' | 'phone' | 'birthDate' | 'sex' | 'email' | 'address' | 'notes';

interface Columna {
  campo: CampoPaciente;
  cabecera: string;
  obligatoria: boolean;
  ancho: number;
  ayuda: string;
}

export const COLUMNAS: Columna[] = [
  { campo: 'name', cabecera: 'Nombre y apellidos', obligatoria: true, ancho: 32, ayuda: 'Nombre completo del paciente.' },
  { campo: 'phone', cabecera: 'Teléfono', obligatoria: true, ancho: 16, ayuda: 'Al menos 9 cifras. Puede llevar prefijo (+34).' },
  { campo: 'birthDate', cabecera: 'Fecha de nacimiento', obligatoria: true, ancho: 20, ayuda: 'Día/mes/año, por ejemplo 15/03/1968.' },
  { campo: 'sex', cabecera: 'Sexo', obligatoria: true, ancho: 12, ayuda: 'Elige en el desplegable: Mujer, Hombre u Otro.' },
  { campo: 'email', cabecera: 'Email', obligatoria: false, ancho: 30, ayuda: 'Opcional. Para enviarle citas e informes.' },
  { campo: 'address', cabecera: 'Dirección', obligatoria: false, ancho: 32, ayuda: 'Opcional.' },
  { campo: 'notes', cabecera: 'Notas', obligatoria: false, ancho: 40, ayuda: 'Opcional. Alergias, observaciones…' },
];

const HOJA_DATOS = 'Pacientes';
const FILAS_CON_AYUDAS = 2000;
// Tamaño máximo razonable de una importación (una farmacia no tiene más)
export const MAX_FILAS = 20000;

const marcaObligatoria = (c: Columna) => (c.obligatoria ? `${c.cabecera} *` : c.cabecera);

/** Plantilla .xlsx vacía, con instrucciones en una segunda hoja */
export async function generarPlantilla(): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Formula Care';

  const hoja = libro.addWorksheet(HOJA_DATOS, { views: [{ state: 'frozen', ySplit: 1 }] });
  hoja.columns = COLUMNAS.map((c) => ({ header: marcaObligatoria(c), key: c.campo, width: c.ancho }));
  const cabecera = hoja.getRow(1);
  cabecera.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cabecera.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B4C9A' } };
  COLUMNAS.forEach((c, i) => {
    hoja.getCell(1, i + 1).note = c.ayuda;
  });

  const indice = (campo: CampoPaciente) => COLUMNAS.findIndex((c) => c.campo === campo) + 1;
  hoja.getColumn(indice('phone')).numFmt = '@';
  hoja.getColumn(indice('birthDate')).numFmt = 'dd/mm/yyyy';
  for (let fila = 2; fila <= FILAS_CON_AYUDAS; fila++) {
    hoja.getCell(fila, indice('sex')).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"Mujer,Hombre,Otro"'],
      showErrorMessage: true,
      errorTitle: 'Sexo',
      error: 'Elige Mujer, Hombre u Otro',
    };
  }

  const instrucciones = libro.addWorksheet('Instrucciones');
  instrucciones.getColumn(1).width = 26;
  instrucciones.getColumn(2).width = 70;
  const lineas: [string, string][] = [
    ['Cómo rellenar esta plantilla', ''],
    ['', 'Escribe un paciente por fila en la hoja «Pacientes», empezando en la fila 2.'],
    ['', 'No cambies ni borres los encabezados de la primera fila.'],
    ['', 'Las columnas con * son obligatorias; las demás pueden quedar vacías.'],
    ['', 'Si un paciente ya está en Formula Care (mismo teléfono, o mismo nombre y fecha de nacimiento), no se importa otra vez.'],
    ['', ''],
    ['Columna', 'Qué escribir'],
    ...COLUMNAS.map((c): [string, string] => [marcaObligatoria(c), c.ayuda]),
    ['', ''],
    ['Ejemplo', 'Ana Martínez López · 612345678 · 15/03/1968 · Mujer · ana@ejemplo.es'],
  ];
  lineas.forEach((linea) => instrucciones.addRow(linea));
  instrucciones.getRow(1).font = { bold: true, size: 14 };
  instrucciones.getRow(7).font = { bold: true };

  return Buffer.from(await libro.xlsx.writeBuffer());
}

// ---------- Lectura ----------

export interface FilaImportable {
  fila: number;
  datos: {
    name: string;
    phone: string;
    birthDate: string;
    sex: 'M' | 'F' | 'O';
    email?: string;
    address?: string;
    notes?: string;
  };
}

export interface ResultadoLectura {
  validas: FilaImportable[];
  errores: { fila: number; motivos: string[] }[];
  duplicados: { fila: number; nombre: string; motivo: string }[];
}

export class ErrorPlantilla extends Error {}

/** Texto de una celda, sea cual sea su tipo (fórmula, enlace, texto enriquecido…) */
function textoCelda(valor: ExcelJS.CellValue): string {
  if (valor === null || valor === undefined) return '';
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === 'object') {
    if ('richText' in valor) return valor.richText.map((t) => t.text).join('').trim();
    if ('text' in valor) return String(valor.text).trim();
    if ('result' in valor) return textoCelda(valor.result as ExcelJS.CellValue);
    return '';
  }
  return String(valor).trim();
}

const dosCifras = (n: number) => String(n).padStart(2, '0');

/** Fecha a YYYY-MM-DD desde una fecha de Excel, un número de serie o un texto */
export function leerFecha(valor: ExcelJS.CellValue): string | null {
  if (valor instanceof Date) {
    // Excel guarda fechas sin hora: exceljs las da a medianoche UTC
    return `${valor.getUTCFullYear()}-${dosCifras(valor.getUTCMonth() + 1)}-${dosCifras(valor.getUTCDate())}`;
  }
  if (typeof valor === 'number' && valor > 0 && valor < 100000) {
    const fecha = new Date(Date.UTC(1899, 11, 30) + Math.round(valor) * 86400000);
    return leerFecha(fecha);
  }
  if (valor && typeof valor === 'object' && 'result' in valor) return leerFecha(valor.result as ExcelJS.CellValue);
  const texto = textoCelda(valor);
  let m = texto.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${dosCifras(Number(m[2]))}-${dosCifras(Number(m[1]))}`;
  m = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${dosCifras(Number(m[2]))}-${dosCifras(Number(m[3]))}`;
  return null;
}

/** «Mujer», «Hombre», «Otro» (y variantes). «M» sola es ambigua (¿mujer o masculino?) */
export function leerSexo(texto: string): 'M' | 'F' | 'O' | null {
  const t = normalizarBusqueda(texto);
  if (['mujer', 'f', 'femenino', 'fem'].includes(t)) return 'F';
  if (['hombre', 'h', 'masculino', 'varon', 'masc'].includes(t)) return 'M';
  if (['otro', 'o', 'otra'].includes(t)) return 'O';
  return null;
}

/** Solo las cifras del teléfono, sin el prefijo de España (para comparar duplicados) */
function cifrasTelefono(telefono: string): string {
  const cifras = telefono.replace(/\D/g, '');
  return cifras.length > 9 && cifras.startsWith('34') ? cifras.slice(2) : cifras;
}

const claveNombreFecha = (nombre: string, fecha: string) => `${normalizarBusqueda(nombre)}|${fecha}`;

/** Mapea cada campo a su número de columna según los encabezados de la fila 1 */
function localizarColumnas(hoja: ExcelJS.Worksheet): Map<CampoPaciente, number> {
  const normalizar = (t: string) => normalizarBusqueda(t.replace(/\*/g, ''));
  const posiciones = new Map<CampoPaciente, number>();
  hoja.getRow(1).eachCell((celda, numero) => {
    const texto = normalizar(textoCelda(celda.value));
    const columna = COLUMNAS.find((c) => normalizar(c.cabecera) === texto);
    if (columna) posiciones.set(columna.campo, numero);
  });
  const faltan = COLUMNAS.filter((c) => c.obligatoria && !posiciones.has(c.campo)).map((c) => c.cabecera);
  if (faltan.length) {
    throw new ErrorPlantilla(
      `Faltan columnas obligatorias: ${faltan.join(', ')}. Usa la plantilla que descarga Formula Care sin cambiar los encabezados.`
    );
  }
  return posiciones;
}

/** Lee el Excel, valida cada fila y separa las que ya existen */
export async function leerImportacion(contenido: Buffer): Promise<ResultadoLectura> {
  const libro = new ExcelJS.Workbook();
  try {
    await libro.xlsx.load(contenido as unknown as ArrayBuffer);
  } catch {
    throw new ErrorPlantilla('No se puede leer el archivo. Tiene que ser la plantilla de Formula Care guardada como Excel (.xlsx).');
  }
  const hoja = libro.getWorksheet(HOJA_DATOS) ?? libro.worksheets[0];
  if (!hoja) throw new ErrorPlantilla('El archivo no tiene ninguna hoja.');
  const posiciones = localizarColumnas(hoja);

  const existentes = await prisma.paciente.findMany({ select: { name: true, phone: true, birthDate: true } });
  const telefonosExistentes = new Set(existentes.map((p) => cifrasTelefono(p.phone)));
  const nombresExistentes = new Set(existentes.map((p) => claveNombreFecha(p.name, p.birthDate)));
  const telefonosArchivo = new Map<string, number>();
  const nombresArchivo = new Map<string, number>();

  const resultado: ResultadoLectura = { validas: [], errores: [], duplicados: [] };
  if (hoja.rowCount - 1 > MAX_FILAS) throw new ErrorPlantilla(`El archivo tiene más de ${MAX_FILAS} filas.`);

  hoja.eachRow({ includeEmpty: false }, (fila, numero) => {
    if (numero === 1) return;
    const valor = (campo: CampoPaciente) => {
      const columna = posiciones.get(campo);
      return columna ? fila.getCell(columna).value : null;
    };
    const texto = (campo: CampoPaciente) => textoCelda(valor(campo));
    if (COLUMNAS.every((c) => !texto(c.campo))) return; // fila vacía

    const motivos: string[] = [];
    const fechaNacimiento = leerFecha(valor('birthDate'));
    const sexo = leerSexo(texto('sex'));
    if (!texto('birthDate')) motivos.push('falta la fecha de nacimiento');
    else if (!fechaNacimiento) motivos.push(`fecha de nacimiento no válida («${texto('birthDate')}»)`);
    if (!texto('sex')) motivos.push('falta el sexo');
    else if (!sexo) motivos.push(`sexo no válido («${texto('sex')}»): escribe Mujer, Hombre u Otro`);

    const candidato = {
      name: texto('name'),
      phone: texto('phone'),
      birthDate: fechaNacimiento ?? '',
      sex: sexo ?? 'O',
      email: texto('email') || undefined,
      address: texto('address') || undefined,
      notes: texto('notes') || undefined,
    };
    const validacion = crearPacienteSchema.safeParse(candidato);
    if (!validacion.success) {
      for (const problema of validacion.error.errors) {
        const campo = String(problema.path[0]);
        if ((campo === 'birthDate' || campo === 'sex') && motivos.length) continue; // ya explicado arriba
        const nombreCampo = COLUMNAS.find((c) => c.campo === campo)?.cabecera ?? campo;
        motivos.push(!candidato[campo as CampoPaciente] ? `falta ${nombreCampo.toLowerCase()}` : `${nombreCampo}: ${problema.message}`);
      }
    }
    if (motivos.length) {
      resultado.errores.push({ fila: numero, motivos: [...new Set(motivos)] });
      return;
    }

    const telefono = cifrasTelefono(candidato.phone);
    const clave = claveNombreFecha(candidato.name, candidato.birthDate);
    const motivoDuplicado = telefonosExistentes.has(telefono)
      ? 'ya hay un paciente con ese teléfono'
      : nombresExistentes.has(clave)
        ? 'ya hay un paciente con ese nombre y fecha de nacimiento'
        : telefonosArchivo.has(telefono)
          ? `repite el teléfono de la fila ${telefonosArchivo.get(telefono)}`
          : nombresArchivo.has(clave)
            ? `repite el paciente de la fila ${nombresArchivo.get(clave)}`
            : null;
    if (motivoDuplicado) {
      resultado.duplicados.push({ fila: numero, nombre: candidato.name, motivo: motivoDuplicado });
      return;
    }
    telefonosArchivo.set(telefono, numero);
    nombresArchivo.set(clave, numero);
    resultado.validas.push({ fila: numero, datos: { ...candidato, sex: candidato.sex } });
  });

  return resultado;
}

/**
 * Crea los pacientes válidos. El consentimiento se da por otorgado en la
 * fecha de importación (decisión de la farmacia: ya lo tenía recogido en su
 * sistema anterior).
 */
export async function importarPacientes(contenido: Buffer): Promise<ResultadoLectura & { importados: number }> {
  const lectura = await leerImportacion(contenido);
  const constancia = await constanciaConsentimiento();
  await prisma.$transaction(
    lectura.validas.map(({ datos }) =>
      prisma.paciente.create({
        data: { ...datos, origen: 'importacion', textoBusqueda: textoBusquedaPaciente(datos), ...constancia },
      })
    )
  );
  return { ...lectura, importados: lectura.validas.length };
}
