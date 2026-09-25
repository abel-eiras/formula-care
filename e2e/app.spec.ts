import { expect, test, type Page } from '@playwright/test';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

// exceljs está en el backend: se usa para rellenar la plantilla como haría el farmacéutico
const requerir = createRequire(path.resolve('backend/package.json'));
const ExcelJS = requerir('exceljs') as typeof import('exceljs');

const ADMIN = { nombre: 'Titular Prueba', email: 'titular@farmacia.es', password: 'clave-segura-123' };

/** Fecha de nacimiento para tener exactamente esta edad hoy (un mes después del cumpleaños) */
function nacidoHaceAnios(anios: number): string {
  const fecha = new Date();
  fecha.setFullYear(fecha.getFullYear() - anios);
  fecha.setMonth(fecha.getMonth() - 1);
  return fecha.toISOString().slice(0, 10);
}

test.describe.configure({ mode: 'serial' });

let page: Page;

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
});

test.afterAll(async () => {
  await page.close();
});

test('primer arranque: se crea la cuenta de administrador', async () => {
  await page.goto('/login');
  await expect(page.getByText('Crear cuenta de administrador')).toBeVisible();
  await page.fill('#nombre', ADMIN.nombre);
  await page.fill('#email', ADMIN.email);
  await page.fill('#password', ADMIN.password);
  await page.locator('button[type=submit]').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: 'Pacientes' })).toBeVisible();
});

test('alta de un paciente y búsqueda sin tildes', async () => {
  await page.goto('/pacientes/nuevo');
  await page.fill('#name', 'Andrés Núñez Prueba');
  await page.fill('#birthDate', nacidoHaceAnios(50));
  await page.locator('#sex').click();
  await page.getByRole('option', { name: 'Hombre' }).click();
  await page.fill('#phone', '699000111');
  const consentimiento = page.locator('#consentimiento');
  if (await consentimiento.isVisible()) await consentimiento.click();
  await page.getByRole('button', { name: 'Guardar Paciente' }).click();
  await expect(page).toHaveURL(/\/pacientes$/);
  await page.getByPlaceholder(/Buscar por nombre/).fill('andres nunez');
  await expect(page.getByText('Andrés Núñez Prueba')).toBeVisible();
});

test('importación de pacientes desde la plantilla Excel', async () => {
  await page.goto('/pacientes');
  await page.getByRole('button', { name: 'Importar desde Excel' }).click();
  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Descargar plantilla' }).click(),
  ]);
  const plantilla = path.join(os.tmpdir(), `plantilla-e2e-${Date.now()}.xlsx`);
  await descarga.saveAs(plantilla);

  const libro = new ExcelJS.Workbook();
  await libro.xlsx.readFile(plantilla);
  const hoja = libro.getWorksheet('Pacientes')!;
  [
    ['Carmen Vázquez Rey', '644111222', '01/06/1955', 'Mujer'],
    ['Fila con error', '644111333', '01/06/1955', 'M'],
    ['Andrés Núñez Prueba', '699000111', '01/01/1976', 'Hombre'], // ya existe
  ].forEach((fila, i) => fila.forEach((valor, j) => (hoja.getCell(i + 2, j + 1).value = valor)));
  await libro.xlsx.writeFile(plantilla);

  await page.locator('input[type=file]').setInputFiles(plantilla);
  await expect(page.getByText('1 paciente listo para importar')).toBeVisible();
  await expect(page.getByText('Fila 3:')).toBeVisible();
  await expect(page.getByText(/Fila 4/)).toBeVisible();
  await page.getByRole('button', { name: /^Importar 1 paciente$/ }).click();
  await expect(page.getByText('1 paciente importado')).toBeVisible();
  await expect(page.getByText('Carmen Vázquez Rey')).toBeVisible();
});

test('bioquímica: SCORE2 reproduce el ejemplo oficial y FINDRISC suma bien', async () => {
  await page.goto('/pacientes');
  const enlace = page.getByRole('row', { name: /Andrés Núñez Prueba/ }).getByRole('link');
  const pacienteId = (await enlace.getAttribute('href'))?.split('/').pop();
  // Abrir la ficha (queda anotado en el registro de accesos)
  await enlace.click();
  await page.waitForURL(/\/pacientes\/[^/]+$/);
  await expect(page.getByRole('heading', { name: 'Andrés Núñez Prueba' })).toBeVisible();
  await page.goto(`/servicios/bio?pacienteId=${pacienteId}`);
  // Ejemplo resuelto del artículo de SCORE2: varón de 50 años, fumador,
  // PAS 140, colesterol total 6,3 mmol/L y HDL 1,4 mmol/L → 6,3 % (región de riesgo bajo)
  for (const [campo, valor] of [
    ['glucemia', '105'],
    ['systolic', '140'],
    ['cholesterol', '243.6'],
    ['cholesterolHDL', '54.1'],
    ['peso', '90'],
    ['altura', '175'],
    ['cintura', '100'],
  ]) {
    await page.fill(`#${campo}`, valor);
  }
  await page.click('#fumador-si');
  await expect(page.getByText('6,3 %')).toBeVisible();
  await expect(page.getByText('Riesgo alto', { exact: true })).toBeVisible();

  await page.click('#hacer-findrisc');
  for (const opcion of ['actividad-no', 'frutaVerdura-diario', 'antihipertensivos-no', 'glucosaAlta-no', 'familiares-primer-grado']) {
    await page.click(`#findrisc-${opcion}`);
  }
  // Edad 2 + IMC 1 + cintura 3 + actividad 2 + familiares 5
  await expect(page.getByText('13 puntos')).toBeVisible();
  await page.getByRole('button', { name: 'Guardar Análisis' }).click();
  await expect(page).toHaveURL(/id=/);
});

test('ayuda: buscador y temas', async () => {
  await page.getByRole('link', { name: 'Ayuda' }).click();
  await page.getByPlaceholder('Buscar en la ayuda…').fill('plantilla');
  await page.getByRole('button', { name: 'Plantillas de correo' }).click();
  await expect(page.getByText('Cómo cambiar el texto sin estropear el diseño')).toBeVisible();
});

test('seguridad: el registro anota los accesos a fichas', async () => {
  await page.goto('/configuracion');
  await page.getByRole('tab', { name: 'Seguridad', exact: true }).click();
  await expect(page.getByText('Registro de accesos')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Inició sesión' }).first()).toBeVisible();
  await expect(page.getByRole('cell', { name: /Consultó ficha del paciente/ }).first()).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Andrés Núñez Prueba' }).first()).toBeVisible();
});
