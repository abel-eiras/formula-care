import { beforeEach, describe, expect, it } from 'vitest';
import { EventEmitter } from 'node:events';
import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../src/lib/prisma.js';
import { describirAcceso, podarRegistroAccesos, registrarAccesos } from '../src/services/registroAccesos.js';
import { crearPaciente, vaciarBaseDeDatos } from './utilidades.js';

describe('qué accesos se anotan', () => {
  it('fichas, análisis, cambios y exportaciones sí', () => {
    expect(describirAcceso('GET', '/api/pacientes/abc')).toEqual({ accion: 'ver', recurso: 'paciente', id: 'abc' });
    expect(describirAcceso('PUT', '/api/pacientes/abc')).toMatchObject({ accion: 'editar', recurso: 'paciente' });
    expect(describirAcceso('DELETE', '/api/pacientes/abc')).toMatchObject({ accion: 'borrar' });
    expect(describirAcceso('POST', '/api/pacientes')).toMatchObject({ accion: 'crear', recurso: 'paciente' });
    expect(describirAcceso('GET', '/api/servicios/bio/x1')).toEqual({ accion: 'ver', recurso: 'bio', id: 'x1' });
    expect(describirAcceso('POST', '/api/servicios/dermo')).toMatchObject({ accion: 'crear', recurso: 'dermo' });
    expect(describirAcceso('DELETE', '/api/nutricion/visitas/v1')).toMatchObject({ accion: 'borrar', recurso: 'visita-nutricion', id: 'v1' });
    expect(describirAcceso('POST', '/api/pacientes/abc/exportar')).toMatchObject({ accion: 'exportar', recurso: 'paciente' });
    expect(describirAcceso('POST', '/api/exportar/pacientes')).toMatchObject({ accion: 'exportar', recurso: 'listado', detalle: 'pacientes' });
    expect(describirAcceso('POST', '/api/informes/enviar')).toMatchObject({ accion: 'enviar', recurso: 'informe' });
  });

  it('listados y rutas sin datos de salud no', () => {
    expect(describirAcceso('GET', '/api/pacientes')).toBeNull();
    expect(describirAcceso('GET', '/api/pacientes?busqueda=ana')).toBeNull();
    expect(describirAcceso('GET', '/api/pacientes/retencion')).toBeNull();
    expect(describirAcceso('GET', '/api/servicios/bio')).toBeNull();
    expect(describirAcceso('GET', '/api/servicios/bio/paciente/abc')).toBeNull();
    expect(describirAcceso('GET', '/api/nutricion/programas')).toBeNull();
    expect(describirAcceso('GET', '/api/citas')).toBeNull();
    expect(describirAcceso('GET', '/api/estadisticas')).toBeNull();
  });
});

/** Simula una petición que pasa por el middleware y termina con el código dado */
async function simular(metodo: string, url: string, estado: number, body: unknown = {}, respuesta: unknown = {}) {
  const res = Object.assign(new EventEmitter(), {
    statusCode: estado,
    json(cuerpo: unknown) { return cuerpo; },
  }) as unknown as Response & EventEmitter;
  const req = { method: metodo, originalUrl: url, body, usuario: { id: 'u1', nombre: 'Laura', email: 'l@f.es', rol: 'farmaceutico' } } as unknown as Request;
  registrarAccesos(req, res, (() => undefined) as NextFunction);
  res.json(respuesta);
  res.emit('finish');
  // El registro se escribe en segundo plano
  await new Promise((r) => setTimeout(r, 50));
}

describe('middleware del registro', () => {
  beforeEach(vaciarBaseDeDatos);

  it('anota quién vio la ficha y de qué paciente', async () => {
    const paciente = await crearPaciente({ name: 'Ana Pérez' });
    await simular('GET', `/api/pacientes/${paciente.id}`, 200);
    const [entrada] = await prisma.registroAcceso.findMany();
    expect(entrada).toMatchObject({ usuarioNombre: 'Laura', accion: 'ver', recurso: 'paciente', pacienteId: paciente.id, pacienteNombre: 'Ana Pérez' });
  });

  it('enlaza un análisis nuevo con su paciente', async () => {
    const paciente = await crearPaciente({ name: 'Luis Gil' });
    await simular('POST', '/api/servicios/bio', 201, { pacienteId: paciente.id });
    const [entrada] = await prisma.registroAcceso.findMany();
    expect(entrada).toMatchObject({ accion: 'crear', recurso: 'bio', pacienteNombre: 'Luis Gil' });
  });

  it('conserva el nombre al borrar el paciente', async () => {
    const paciente = await crearPaciente({ name: 'Eva Ruiz' });
    const res = Object.assign(new EventEmitter(), { statusCode: 200, json: (c: unknown) => c }) as unknown as Response & EventEmitter;
    const req = { method: 'DELETE', originalUrl: `/api/pacientes/${paciente.id}`, body: {}, usuario: { id: 'u1', nombre: 'Laura' } } as unknown as Request;
    registrarAccesos(req, res, (() => undefined) as NextFunction);
    await new Promise((r) => setTimeout(r, 20));
    await prisma.paciente.delete({ where: { id: paciente.id } });
    res.emit('finish');
    await new Promise((r) => setTimeout(r, 50));
    const [entrada] = await prisma.registroAcceso.findMany();
    expect(entrada).toMatchObject({ accion: 'borrar', pacienteNombre: 'Eva Ruiz' });
  });

  it('no anota peticiones fallidas', async () => {
    await simular('GET', '/api/pacientes/no-existe', 404);
    expect(await prisma.registroAcceso.count()).toBe(0);
  });

  it('borra lo anterior a dos años', async () => {
    await prisma.registroAcceso.createMany({
      data: [
        { usuarioNombre: 'x', accion: 'ver', recurso: 'paciente', fecha: new Date('2020-01-01') },
        { usuarioNombre: 'x', accion: 'ver', recurso: 'paciente' },
      ],
    });
    expect(await podarRegistroAccesos()).toBe(1);
    expect(await prisma.registroAcceso.count()).toBe(1);
  });
});
