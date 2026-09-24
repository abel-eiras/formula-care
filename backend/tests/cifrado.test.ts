import { describe, expect, it } from 'vitest';
import {
  cifrarSolicitud,
  datosAsociados,
  descifrarSolicitud,
  generarParClaves,
  huellaClave,
} from '../src/services/reservaOnline/cifrado.js';

const datos = { nombre: 'Lucía', email: 'lucia@ejemplo.es', telefono: '611222333', fechaNacimiento: '1990-05-17', sexo: 'F' as const };

describe('cifrado del buzón de la reserva online', () => {
  it('descifra lo que cifra el navegador con la clave pública', async () => {
    const { publica, privada } = await generarParClaves();
    const aad = datosAsociados('dermo', '2026-10-01', '09:00');
    const sobre = await cifrarSolicitud(datos, publica, aad);
    expect(sobre.datos).not.toContain('Lucía');
    await expect(descifrarSolicitud(sobre, privada, aad)).resolves.toMatchObject(datos);
  });

  it('rechaza un sobre movido a otro hueco (datos asociados alterados)', async () => {
    const { publica, privada } = await generarParClaves();
    const sobre = await cifrarSolicitud(datos, publica, datosAsociados('dermo', '2026-10-01', '09:00'));
    await expect(descifrarSolicitud(sobre, privada, datosAsociados('dermo', '2026-10-01', '10:30'))).rejects.toThrow();
  });

  it('no se puede descifrar con la clave de otra farmacia', async () => {
    const a = await generarParClaves();
    const b = await generarParClaves();
    const aad = datosAsociados('bio', '2026-10-01', '09:00');
    const sobre = await cifrarSolicitud(datos, a.publica, aad);
    await expect(descifrarSolicitud(sobre, b.privada, aad)).rejects.toThrow();
  });

  it('la clave pública no incluye la parte privada y su huella es estable', async () => {
    const { publica } = await generarParClaves();
    expect(publica).not.toHaveProperty('d');
    expect(await huellaClave(publica)).toBe(await huellaClave({ ...publica }));
    expect(await huellaClave(publica)).toMatch(/^([0-9A-F]{2}:){7}[0-9A-F]{2}$/);
  });
});
