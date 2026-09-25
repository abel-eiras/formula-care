import { beforeEach, describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { prisma } from '../src/lib/prisma.js';
import {
  ErrorPlantilla,
  generarPlantilla,
  importarPacientes,
  leerFecha,
  leerImportacion,
  leerSexo,
} from '../src/services/importacionPacientes.js';
import { crearPaciente, vaciarBaseDeDatos } from './utilidades.js';

/** Rellena la plantilla oficial con las filas dadas, como haría el farmacéutico */
async function plantillaRellena(filas: ExcelJS.CellValue[][]): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load((await generarPlantilla()) as unknown as ArrayBuffer);
  const hoja = libro.getWorksheet('Pacientes')!;
  filas.forEach((fila, i) => {
    fila.forEach((valor, j) => {
      hoja.getCell(i + 2, j + 1).value = valor;
    });
  });
  return Buffer.from(await libro.xlsx.writeBuffer());
}

describe('lectura de celdas', () => {
  it('fechas en todos los formatos habituales', () => {
    expect(leerFecha(new Date(Date.UTC(1968, 2, 15)))).toBe('1968-03-15');
    expect(leerFecha('15/03/1968')).toBe('1968-03-15');
    expect(leerFecha('5-3-1968')).toBe('1968-03-05');
    expect(leerFecha('1968-03-15')).toBe('1968-03-15');
    expect(leerFecha(24912)).toBe('1968-03-15'); // número de serie de Excel
    expect(leerFecha('marzo del 68')).toBeNull();
  });

  it('sexo: palabras claras sí, «M» sola no (¿mujer o masculino?)', () => {
    expect(leerSexo('Mujer')).toBe('F');
    expect(leerSexo('HOMBRE')).toBe('M');
    expect(leerSexo('varón')).toBe('M');
    expect(leerSexo('Otro')).toBe('O');
    expect(leerSexo('M')).toBeNull();
  });
});

describe('importación de pacientes', () => {
  beforeEach(vaciarBaseDeDatos);

  it('importa las filas válidas con el consentimiento registrado', async () => {
    const archivo = await plantillaRellena([
      ['Ana Martínez López', '612345678', new Date(Date.UTC(1968, 2, 15)), 'Mujer', { text: 'ana@ejemplo.es', hyperlink: 'mailto:ana@ejemplo.es' }, 'C/ Mayor 1', 'Alergia al níquel'],
      ['Luis Gil', 612000111, '02/11/1975', 'Hombre'],
    ]);
    const resultado = await importarPacientes(archivo);
    expect(resultado.importados).toBe(2);
    const ana = await prisma.paciente.findFirst({ where: { name: 'Ana Martínez López' } });
    expect(ana).toMatchObject({ phone: '612345678', birthDate: '1968-03-15', sex: 'F', email: 'ana@ejemplo.es', origen: 'importacion', notes: 'Alergia al níquel' });
    expect(ana?.consentimientoFecha).toBeInstanceOf(Date);
    expect(ana?.textoBusqueda).toContain('martinez');
    const luis = await prisma.paciente.findFirst({ where: { name: 'Luis Gil' } });
    expect(luis).toMatchObject({ phone: '612000111', birthDate: '1975-11-02', sex: 'M' });
  });

  it('explica por qué no se puede importar una fila', async () => {
    const { validas, errores } = await leerImportacion(
      await plantillaRellena([
        ['Sin fecha', '612345678', '', 'Mujer'],
        ['Sexo raro', '612345679', '01/01/1980', 'M'],
        ['', '612345670', '01/01/1980', 'Hombre'],
        ['Teléfono corto', '1234', '01/01/1980', 'Hombre'],
      ])
    );
    expect(validas).toHaveLength(0);
    expect(errores.map((e) => e.fila)).toEqual([2, 3, 4, 5]);
    expect(errores[0].motivos.join()).toContain('fecha de nacimiento');
    expect(errores[1].motivos.join()).toContain('Mujer, Hombre u Otro');
    expect(errores[2].motivos.join()).toContain('nombre');
    expect(errores[3].motivos.join()).toContain('Teléfono');
  });

  it('salta los que ya existen o se repiten en el archivo', async () => {
    await crearPaciente({ name: 'Eva Ruiz', phone: '+34 600 111 222' });
    const { validas, duplicados } = await leerImportacion(
      await plantillaRellena([
        ['Otra persona', '600111222', '01/01/1980', 'Mujer'], // mismo teléfono (sin prefijo)
        ['Pedro Sanz', '611111111', '01/01/1980', 'Hombre'],
        ['Pedro Sánz', '622222222', '01/01/1980', 'Hombre'], // mismo nombre (sin tilde) y fecha
      ])
    );
    expect(validas.map((v) => v.datos.name)).toEqual(['Pedro Sanz']);
    expect(duplicados.map((d) => d.fila)).toEqual([2, 4]);
    expect(duplicados[0].motivo).toContain('teléfono');
    expect(duplicados[1].motivo).toContain('fila 3');
  });

  it('rechaza un Excel que no es la plantilla', async () => {
    const libro = new ExcelJS.Workbook();
    libro.addWorksheet('Hoja1').addRow(['Nombre', 'Móvil']);
    const archivo = Buffer.from(await libro.xlsx.writeBuffer());
    await expect(leerImportacion(archivo)).rejects.toThrow(ErrorPlantilla);
    await expect(leerImportacion(Buffer.from('no es un excel'))).rejects.toThrow(/No se puede leer/);
  });
});
