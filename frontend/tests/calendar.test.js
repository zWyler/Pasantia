import assert from 'node:assert/strict';
import process from 'node:process';
import test from 'node:test';
import {
    agruparTareasPorDia,
    diasDelCalendario,
    desplazarMes,
    ESTADOS_TAREA,
    fechaLocalClave,
    PRIORIDADES_TAREA,
    tareasSinFecha,
    tituloMes,
} from '../src/utils/academic.js';

process.env.TZ = 'America/Santo_Domingo';

test('calendar grid includes every week row and starts on Monday', () => {
    const days = diasDelCalendario(new Date(2026, 4, 1));

    assert.equal(days.length, 42);
    assert.equal(days[0].clave, '2026-04-27');
    assert.equal(days[0].perteneceAlMes, false);
    assert.equal(days.find((day) => day.clave === '2026-05-01').perteneceAlMes, true);
    assert.match(tituloMes(new Date(2026, 4, 1)), /mayo.*2026/i);
});

test('month navigation crosses year boundaries without carrying an invalid day', () => {
    const diciembre = desplazarMes(new Date(2026, 11, 18), 1);
    const noviembre = desplazarMes(diciembre, -2);

    assert.deepEqual([diciembre.getFullYear(), diciembre.getMonth(), diciembre.getDate()], [2027, 0, 1]);
    assert.deepEqual([noviembre.getFullYear(), noviembre.getMonth(), noviembre.getDate()], [2026, 10, 1]);
});

test('UTC instants are grouped by the browser local date across year boundaries', () => {
    assert.equal(fechaLocalClave('2026-01-01T02:30:00Z'), '2025-12-31');
    assert.equal(fechaLocalClave('2026-01-01T04:00:00Z'), '2026-01-01');
});

test('multiple tasks share a day and null due dates stay outside the calendar grid', () => {
    const tareas = [
        { id: 1, fecha_entrega: '2026-11-02T14:00:00Z' },
        { id: 2, fecha_entrega: '2026-11-02T19:00:00Z' },
        { id: 3, fecha_entrega: null },
    ];
    const grupos = agruparTareasPorDia(tareas);

    assert.equal(grupos.get('2026-11-02').length, 2);
    assert.deepEqual(tareasSinFecha(tareas).map((tarea) => tarea.id), [3]);
});

test('calendar labels cover every supported task status and priority', () => {
    assert.deepEqual(ESTADOS_TAREA.map(([value]) => value), ['pendiente', 'en_progreso', 'completada']);
    assert.deepEqual(PRIORIDADES_TAREA.map(([value]) => value), ['baja', 'media', 'alta']);
});
