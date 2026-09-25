import { describe, expect, it } from 'vitest';
import { aCsv } from '../src/controllers/exportaciones.js';

describe('exportación a CSV para Excel', () => {
  it('usa BOM, punto y coma y comillas donde hace falta', () => {
    const csv = aCsv(['Nombre', 'Notas'], [['María "Mari" López', 'uno; dos'], ['Ana', null]]);
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('"María ""Mari"" López";"uno; dos"');
    expect(csv).toContain('Ana;\r\n');
  });

  it('neutraliza texto que Excel ejecutaría como fórmula', () => {
    expect(aCsv(['x'], [['=HYPERLINK("http://malo")']])).toContain(`"'=HYPERLINK(""http://malo"")"`);
  });
});
