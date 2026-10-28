import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { apiRequest } from '../api';
import ThemeToggle from '../components/ThemeToggle';
import './StudentLayout.css';

const MODULOS = [
    { to: '/', label: 'Inicio', icon: '⌂', pending: false, end: true },
    { to: '/materias', label: 'Materias', icon: '▦', pending: false },
    { to: '/tareas', label: 'Tareas', icon: '✓', pending: false },
    { to: '/calendario', label: 'Calendario', icon: '◷', pending: false },
    { to: '/estadisticas', label: 'Estadísticas', icon: '▤', pending: false },
    { to: '/notificaciones', label: 'Notificaciones', icon: '♧', pending: false },
];

function StudentLayout({ usuario, cerrarSesion, tema, alternarTema }) {
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [notificacionesNoLeidas, setNotificacionesNoLeidas] = useState(0);

    const actualizarContador = useCallback(async () => {
        try {
            const respuesta = await apiRequest('/notificaciones/contador');
            setNotificacionesNoLeidas(Number(respuesta.no_leidas) || 0);
        } catch (error) {
            if (error.status === 401) setNotificacionesNoLeidas(0);
        }
    }, []);

    useEffect(() => {
        const inicio = window.setTimeout(actualizarContador, 0);
        const intervalo = window.setInterval(actualizarContador, 60_000);
        window.addEventListener('focus', actualizarContador);

        return () => {
            window.clearTimeout(inicio);
            window.clearInterval(intervalo);
            window.removeEventListener('focus', actualizarContador);
        };
    }, [actualizarContador]);

    useEffect(() => {
        if (!menuAbierto) return undefined;

        const cerrarConEscape = (evento) => {
            if (evento.key === 'Escape') setMenuAbierto(false);
        };
        window.addEventListener('keydown', cerrarConEscape);
        return () => window.removeEventListener('keydown', cerrarConEscape);
    }, [menuAbierto]);

    return (
        <div className="student-shell">
            <a className="skip-link" href="#main-content">Saltar al contenido principal</a>
            {menuAbierto && (
                <button
                    type="button"
                    className="sidebar-scrim"
                    aria-label="Cerrar navegación"
                    onClick={() => setMenuAbierto(false)}
                />
            )}

            <aside id="student-navigation" className={`student-sidebar ${menuAbierto ? 'is-open' : ''}`}>
                <NavLink to="/" className="sidebar-brand" onClick={() => setMenuAbierto(false)}>
                    <span className="brand-mark" aria-hidden="true">S</span>
                    <span>Study<strong>Hub</strong></span>
                </NavLink>

                <p className="sidebar-caption">ESPACIO ACADÉMICO</p>
                <nav className="sidebar-nav" aria-label="Módulos principales">
                    {MODULOS.map((modulo) => (
                        <NavLink
                            key={modulo.to}
                            to={modulo.to}
                            end={modulo.end}
                            onClick={() => setMenuAbierto(false)}
                            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                        >
                            <span className="sidebar-icon" aria-hidden="true">{modulo.icon}</span>
                            <span className="sidebar-link-label">{modulo.label}</span>
                            {modulo.to === '/notificaciones' && notificacionesNoLeidas > 0 && (
                                <span className="notification-nav-count" aria-label={`${notificacionesNoLeidas} sin leer`}>
                                    {notificacionesNoLeidas > 99 ? '99+' : notificacionesNoLeidas}
                                </span>
                            )}
                            {modulo.pending && <span className="sidebar-pending">Próximamente</span>}
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-account">
                    <div className="account-avatar" aria-hidden="true">
                        {(usuario?.name || 'E').trim().charAt(0).toUpperCase()}
                    </div>
                    <div className="account-copy">
                        <strong>{usuario?.name || 'Estudiante'}</strong>
                        <span>Cuenta personal</span>
                    </div>
                    <button type="button" className="logout-button" onClick={cerrarSesion}>
                        Salir
                    </button>
                </div>
            </aside>

            <div className="student-main-column">
                <header className="student-topbar">
                    <button
                        type="button"
                        className="mobile-menu-button"
                        aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
                        aria-controls="student-navigation"
                        aria-expanded={menuAbierto}
                        onClick={() => setMenuAbierto((abierto) => !abierto)}
                    >
                        <span />
                        <span />
                        <span />
                    </button>
                    <span className="topbar-context">Tu espacio de estudio</span>
                    <div className="topbar-actions">
                        <span className="topbar-greeting">Hola, {usuario?.name?.split(' ')[0] || 'estudiante'}</span>
                        <ThemeToggle theme={tema} onToggle={alternarTema} />
                    </div>
                </header>
                <main className="student-content" id="main-content" tabIndex="-1">
                    <Outlet context={{ notificacionesNoLeidas, setNotificacionesNoLeidas }} />
                </main>
            </div>
        </div>
    );
}

export default StudentLayout;
