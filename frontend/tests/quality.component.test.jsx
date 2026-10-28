import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import process from 'node:process';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ApplicationErrorBoundary from '../src/components/ApplicationErrorBoundary';
import ThemeToggle from '../src/components/ThemeToggle';
import Login from '../src/components/Login';
import Register from '../src/components/Register';
import NotificacionesPage from '../src/pages/NotificacionesPage';
import TareasPage from '../src/pages/TareasPage';
import StudentLayout from '../src/layouts/StudentLayout';
import { ApiError, apiRequest } from '../src/api';
import { initialTheme, persistTheme, resolveTheme } from '../src/utils/theme';

vi.mock('../src/api', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...actual, apiRequest: vi.fn() };
});

const notificacion = (id, leida = null) => ({
    id,
    titulo: `Aviso ${id}`,
    mensaje: `Mensaje ${id}`,
    created_at: '2026-10-28T12:00:00Z',
    leida_en: leida,
    tarea_id: null,
    tarea: null,
});

function renderNotifications(countContext = 2) {
    const setNotificacionesNoLeidas = vi.fn();
    render(
        <MemoryRouter initialEntries={['/notificaciones']}>
            <Routes>
                <Route element={<Outlet context={{
                    notificacionesNoLeidas: countContext,
                    setNotificacionesNoLeidas,
                }} />}>
                    <Route path="/notificaciones" element={<NotificacionesPage />} />
                </Route>
            </Routes>
        </MemoryRouter>,
    );
    return setNotificacionesNoLeidas;
}

describe('calidad de la interfaz', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.mocked(apiRequest).mockReset();
    });

    afterEach(() => cleanup());

    it('prioriza tema guardado, respeta el sistema cuando falta y alterna con teclado', async () => {
        expect(resolveTheme(null, true)).toBe('dark');
        expect(resolveTheme('light', true)).toBe('light');
        expect(resolveTheme('valor-invalido', false)).toBe('light');

        localStorage.setItem('studyhub-theme', 'dark');
        expect(initialTheme()).toBe('dark');

        const user = userEvent.setup();
        const alternar = vi.fn();
        render(<ThemeToggle theme="light" onToggle={alternar} />);
        const control = screen.getByRole('button', { name: 'Activar modo oscuro' });
        control.focus();
        await user.keyboard('{Enter}');

        expect(alternar).toHaveBeenCalledOnce();
        expect(control.getAttribute('aria-pressed')).toBe('false');
        persistTheme('dark');
        expect(document.documentElement.dataset.theme).toBe('dark');
        expect(localStorage.getItem('studyhub-theme')).toBe('dark');
    });

    it('muestra notificaciones, permite marcar todas como leídas y eliminarlas', async () => {
        const lista = [notificacion(1), notificacion(2)];
        vi.mocked(apiRequest).mockImplementation((path, options = {}) => {
            if (path.startsWith('/notificaciones?')) {
                return Promise.resolve({
                    notificaciones: lista,
                    paginacion: { pagina: 1, ultima_pagina: 1, total: lista.length },
                });
            }
            if (path === '/notificaciones/leer-todas') return Promise.resolve({ actualizadas: 2 });
            if (path === '/notificaciones/1' && options.method === 'DELETE') return Promise.resolve({});
            return Promise.reject(new Error(`Solicitud de prueba inesperada: ${path}`));
        });

        const user = userEvent.setup();
        renderNotifications();
        expect(await screen.findByRole('heading', { name: 'Aviso 1' })).not.toBeNull();
        expect(screen.getAllByText('Sin leer')).toHaveLength(2);

        await user.click(screen.getByRole('button', { name: 'Marcar todas como leídas' }));
        await waitFor(() => expect(screen.getAllByText('Leída')).toHaveLength(2));

        await user.click(screen.getAllByRole('button', { name: 'Eliminar' })[0]);
        await waitFor(() => expect(screen.queryByRole('heading', { name: 'Aviso 1' })).toBeNull());
        expect(screen.getByRole('heading', { name: 'Aviso 2' })).not.toBeNull();
    });

    it('renderiza contenido aportado por usuarios como texto y no como HTML', async () => {
        const titulo = '<img src=x onerror=alert(1)>';
        vi.mocked(apiRequest).mockResolvedValueOnce({
            notificaciones: [{ ...notificacion(1), titulo }],
            paginacion: { pagina: 1, ultima_pagina: 1, total: 1 },
        });
        renderNotifications(1);

        expect(await screen.findByRole('heading', { name: titulo })).not.toBeNull();
        expect(document.querySelector('img')).toBeNull();
    });

    it('presenta estado vacío y errores de conexión sin mensajes internos', async () => {
        vi.mocked(apiRequest).mockResolvedValueOnce({
            notificaciones: [],
            paginacion: { pagina: 1, ultima_pagina: 1, total: 0 },
        });
        renderNotifications(0);
        expect(await screen.findByRole('heading', { name: 'No tienes notificaciones' })).not.toBeNull();

        cleanup();
        vi.mocked(apiRequest).mockRejectedValueOnce(new ApiError('detalle interno omitido', 500));
        renderNotifications();
        expect((await screen.findByRole('alert')).textContent).toContain('Ocurrió un error en el servidor.');
        expect(screen.queryByText('detalle interno omitido')).toBeNull();
    });

    it('combina la búsqueda de tareas con el estado seleccionado', async () => {
        const solicitudes = [];
        vi.mocked(apiRequest).mockImplementation((path) => {
            if (path === '/materias') return Promise.resolve({ materias: [{ id: 7, nombre: 'Biología' }] });
            solicitudes.push(path);
            return Promise.resolve({ tareas: [] });
        });

        const user = userEvent.setup();
        render(
            <MemoryRouter initialEntries={['/tareas']}>
                <Routes><Route path="/tareas" element={<TareasPage />} /></Routes>
            </MemoryRouter>,
        );

        await screen.findByRole('heading', { name: 'Tareas' });
        await user.type(screen.getByLabelText('Buscar'), 'ensayo');
        await user.selectOptions(document.getElementById('filtro-estado'), 'pendiente');

        await waitFor(() => {
            const solicitudCombinada = solicitudes.find((path) => {
                const parametros = new URLSearchParams(path.split('?')[1]);
                return parametros.get('q') === 'ensayo' && parametros.get('estado') === 'pendiente';
            });
            expect(solicitudCombinada).toBeDefined();
        });
    });

    it('mantiene mensajes de error seguros en el inicio de sesión y valida la confirmación del registro', async () => {
        vi.mocked(apiRequest).mockRejectedValueOnce(new ApiError('Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.', 500));
        const user = userEvent.setup();
        render(<MemoryRouter><Login alIniciarSesion={vi.fn()} /></MemoryRouter>);
        await user.type(screen.getByLabelText('Correo electrónico'), 'ana@example.test');
        await user.type(screen.getByLabelText('Contraseña'), 'ClaveSegura!2026');
        await user.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
        expect((await screen.findByRole('status')).textContent).toContain('Ocurrió un error en el servidor.');
        expect(screen.queryByText(/SQLSTATE|stack trace/i)).toBeNull();

        cleanup();
        render(<MemoryRouter><Register /></MemoryRouter>);
        expect(screen.getByLabelText('Nombre')).not.toBeNull();
        expect(screen.getByLabelText('Correo electrónico')).not.toBeNull();
        await user.type(screen.getByLabelText('Nombre'), 'Ana');
        await user.type(screen.getByLabelText('Correo electrónico'), 'ana@example.test');
        await user.type(screen.getByLabelText('Contraseña'), 'ClaveSegura!2026');
        await user.type(screen.getByLabelText('Confirmar contraseña'), 'OtraClave!2026');
        await user.click(screen.getByRole('button', { name: 'Crear mi cuenta' }));
        expect((await screen.findByRole('alert')).textContent).toContain('Las contraseñas no coinciden.');
        expect(apiRequest).toHaveBeenCalledOnce();
    });

    it('recupera una pantalla que falla durante el renderizado', async () => {
        const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
        function PantallaRota() {
            throw new Error('detalle privado');
        }

        render(<ApplicationErrorBoundary><PantallaRota /></ApplicationErrorBoundary>);
        expect(screen.getByRole('heading', { name: 'No pudimos mostrar esta pantalla' })).not.toBeNull();
        expect(screen.getByRole('button', { name: 'Volver a cargar' })).not.toBeNull();
        expect(errorLog).toHaveBeenCalledWith('StudyHub no pudo renderizar una pantalla.', 'Error');
    });

    it('expone una navegación móvil operable por teclado', async () => {
        vi.mocked(apiRequest).mockResolvedValue({ no_leidas: 0 });
        const user = userEvent.setup();
        render(
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route element={<StudentLayout
                        usuario={{ name: 'Ana' }}
                        cerrarSesion={vi.fn()}
                        tema="light"
                        alternarTema={vi.fn()}
                    />}>
                        <Route path="/" element={<p>Contenido académico</p>} />
                    </Route>
                </Routes>
            </MemoryRouter>,
        );

        expect(screen.getByRole('link', { name: 'Saltar al contenido principal' })).not.toBeNull();
        const menu = screen.getByRole('button', { name: 'Abrir menú' });
        await user.click(menu);
        expect(menu.getAttribute('aria-expanded')).toBe('true');
        await user.keyboard('{Escape}');
        expect(screen.getByRole('button', { name: 'Abrir menú' }).getAttribute('aria-expanded')).toBe('false');
    });

    it('conserva puntos de quiebre para móvil, tableta y escritorio', () => {
        const layout = readFileSync(resolve(process.cwd(), 'src/layouts/StudentLayout.css'), 'utf8');
        const academic = readFileSync(resolve(process.cwd(), 'src/styles/academic.css'), 'utf8');
        const calendar = readFileSync(resolve(process.cwd(), 'src/styles/calendar.css'), 'utf8');
        const global = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

        expect(layout).toMatch(/max-width:\s*760px/);
        expect(layout).toMatch(/max-width:\s*360px/);
        expect(academic).toMatch(/max-width:\s*520px/);
        expect(calendar).toMatch(/max-width:\s*390px/);
        expect(global).toContain('overflow-x: clip');
        expect(global).toContain('min-width: 320px');
    });
});
