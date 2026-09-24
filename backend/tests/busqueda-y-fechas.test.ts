import { describe, expect, it } from 'vitest';
import { normalizarBusqueda, textoBusquedaPaciente } from '../src/lib/textoBusqueda.js';
import { fechaHaceAnios, hoyISO } from '../src/lib/fechas.js';

describe('búsqueda de pacientes', () => {
  it('ignora mayúsculas, tildes y espacios repetidos', () => {
    expect(normalizarBusqueda('  María   JOSÉ ')).toBe('maria jose');
  });

  it('incluye el teléfono también sin espacios', () => {
    expect(textoBusquedaPaciente({ name: 'Ñandú', phone: '611 22 33 44', email: null })).toContain('611223344');
  });
});

describe('fechas en hora local', () => {
  it('hoyISO usa el día local, no el de UTC', () => {
    // 00:30 del 1 de marzo en España sigue siendo 28 de febrero en UTC
    expect(hoyISO(new Date('2026-03-01T00:30:00'))).toBe('2026-03-01');
  });

  it('fechaHaceAnios devuelve YYYY-MM-DD', () => {
    expect(fechaHaceAnios(10)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
