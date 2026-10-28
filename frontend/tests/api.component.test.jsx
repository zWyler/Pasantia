import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiRequest } from '../src/api';
import { textoError } from '../src/utils/academic';

describe('errores de API', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('oculta detalles internos de errores del servidor', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            json: async () => ({ message: 'SQLSTATE private trace' }),
        }));

        await expect(apiRequest('/materias')).rejects.toMatchObject({
            name: 'ApiError',
            status: 500,
            message: 'Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.',
        });
    });

    it('conserva los mensajes de validación y traduce errores de red', async () => {
        vi.stubGlobal('fetch', vi.fn()
            .mockResolvedValueOnce({
                ok: false,
                status: 422,
                json: async () => ({ errors: { titulo: ['El título es obligatorio.'] } }),
            })
            .mockRejectedValueOnce(new TypeError('Failed to fetch')));

        await expect(apiRequest('/tareas')).rejects.toMatchObject({
            status: 422,
            message: 'El título es obligatorio.',
        });
        await expect(apiRequest('/tareas')).rejects.toMatchObject({
            name: 'ApiError',
            status: 0,
            message: 'No se pudo conectar con StudyHub. Comprueba tu conexión e inténtalo de nuevo.',
        });
        expect(textoError({ status: 403 })).toBe('No tienes permiso para realizar esta acción.');
        expect(textoError({ status: 429 })).toContain('Espera un momento');
        expect(new ApiError('mensaje', 500).status).toBe(500);
    });
});
