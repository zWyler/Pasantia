import { useEffect, useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { apiRequest } from '../api';
import { fechaVisible, textoError } from '../utils/academic';
import '../styles/academic.css';
import '../styles/notifications.css';

const POR_PAGINA = 20;

function NotificacionesPage() {
    const { notificacionesNoLeidas, setNotificacionesNoLeidas } = useOutletContext();
    const [notificaciones, setNotificaciones] = useState([]);
    const [paginacion, setPaginacion] = useState({ pagina: 1, ultima_pagina: 1, total: 0 });
    const [pagina, setPagina] = useState(1);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [actualizandoId, setActualizandoId] = useState(null);
    const [marcandoTodas, setMarcandoTodas] = useState(false);

    useEffect(() => {
        const abortController = new AbortController();
        apiRequest(`/notificaciones?page=${pagina}&per_page=${POR_PAGINA}`, {
            signal: abortController.signal,
        })
            .then((respuesta) => {
                setNotificaciones(respuesta.notificaciones);
                setPaginacion(respuesta.paginacion);
            })
            .catch((requestError) => {
                const mensaje = textoError(requestError);
                if (mensaje) {
                    setNotificaciones([]);
                    setError(mensaje);
                }
            })
            .finally(() => {
                if (!abortController.signal.aborted) setCargando(false);
            });

        return () => abortController.abort();
    }, [pagina]);

    const manejarError = (requestError) => {
        const mensaje = textoError(requestError);
        if (mensaje) setError(mensaje);
    };

    const cambiarPagina = (nuevaPagina) => {
        setCargando(true);
        setError('');
        setPagina(nuevaPagina);
    };

    const marcarLeida = async (notificacion) => {
        setError('');
        setActualizandoId(notificacion.id);
        try {
            const respuesta = await apiRequest(`/notificaciones/${notificacion.id}/leer`, {
                method: 'PATCH',
            });
            setNotificaciones((actuales) => actuales.map((item) => (
                item.id === notificacion.id ? respuesta.notificacion : item
            )));
            if (!notificacion.leida_en) {
                setNotificacionesNoLeidas((cantidad) => Math.max(0, cantidad - 1));
            }
        } catch (requestError) {
            manejarError(requestError);
        } finally {
            setActualizandoId(null);
        }
    };

    const marcarTodasLeidas = async () => {
        setError('');
        setMarcandoTodas(true);
        try {
            await apiRequest('/notificaciones/leer-todas', { method: 'PATCH' });
            const ahora = new Date().toISOString();
            setNotificaciones((actuales) => actuales.map((item) => ({
                ...item,
                leida_en: item.leida_en || ahora,
            })));
            setNotificacionesNoLeidas(0);
        } catch (requestError) {
            manejarError(requestError);
        } finally {
            setMarcandoTodas(false);
        }
    };

    const eliminar = async (notificacion) => {
        setError('');
        setActualizandoId(notificacion.id);
        try {
            await apiRequest(`/notificaciones/${notificacion.id}`, { method: 'DELETE' });
            setNotificaciones((actuales) => actuales.filter((item) => item.id !== notificacion.id));
            setPaginacion((actual) => ({ ...actual, total: Math.max(0, actual.total - 1) }));
            if (!notificacion.leida_en) {
                setNotificacionesNoLeidas((cantidad) => Math.max(0, cantidad - 1));
            }
            if (notificaciones.length === 1 && pagina > 1) {
                cambiarPagina(pagina - 1);
            }
        } catch (requestError) {
            manejarError(requestError);
        } finally {
            setActualizandoId(null);
        }
    };

    return (
        <section className="module-page notifications-page">
            <header className="module-page-heading">
                <div>
                    <p className="module-eyebrow">Avisos académicos</p>
                    <h1>Notificaciones</h1>
                    <p>Recordatorios de fechas de entrega y tareas pendientes.</p>
                </div>
                <button
                    type="button"
                    className="module-secondary"
                    onClick={marcarTodasLeidas}
                    disabled={marcandoTodas || notificacionesNoLeidas === 0}
                >
                    {marcandoTodas ? 'Actualizando…' : 'Marcar todas como leídas'}
                </button>
            </header>

            {error && <p className="module-alert error" role="alert">{error}</p>}
            {cargando && <p className="module-muted notifications-loading" role="status">Cargando notificaciones…</p>}
            {!cargando && !error && paginacion.total === 0 && (
                <section className="notifications-empty module-panel" role="status">
                    <span aria-hidden="true">✓</span>
                    <h2>No tienes notificaciones</h2>
                    <p>Los recordatorios de tus fechas de entrega aparecerán aquí.</p>
                </section>
            )}

            {!cargando && !error && paginacion.total > 0 && (
                <>
                    <p className="notifications-total">{paginacion.total} notificaciones</p>
                    <div className="notifications-list" aria-live="polite">
                        {notificaciones.map((notificacion) => (
                            <article
                                className={`notification-card ${notificacion.leida_en ? 'is-read' : 'is-unread'}`}
                                key={notificacion.id}
                            >
                                <div className="notification-card-heading">
                                    <h2>{notificacion.titulo}</h2>
                                    <span className={`notification-read-label ${notificacion.leida_en ? 'read' : 'unread'}`}>
                                        {notificacion.leida_en ? 'Leída' : 'Sin leer'}
                                    </span>
                                </div>
                                <p>{notificacion.mensaje}</p>
                                <time dateTime={notificacion.created_at}>Generada {fechaVisible(notificacion.created_at)}</time>
                                {notificacion.tarea ? (
                                    <Link
                                        to="/tareas"
                                        state={{ editTaskId: notificacion.tarea.id }}
                                        className="notification-task-link"
                                    >
                                        Abrir tarea: {notificacion.tarea.titulo}
                                    </Link>
                                ) : notificacion.tarea_id ? (
                                    <p className="notification-unavailable">La tarea relacionada ya no está disponible.</p>
                                ) : (
                                    <p className="notification-unavailable">La tarea relacionada fue eliminada.</p>
                                )}
                                <div className="notification-actions">
                                    {!notificacion.leida_en && (
                                        <button
                                            type="button"
                                            className="notification-action"
                                            disabled={actualizandoId === notificacion.id}
                                            onClick={() => marcarLeida(notificacion)}
                                        >
                                            Marcar como leída
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className="notification-action danger"
                                        disabled={actualizandoId === notificacion.id}
                                        onClick={() => eliminar(notificacion)}
                                    >
                                        Eliminar
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>

                    {paginacion.ultima_pagina > 1 && (
                        <nav className="notification-pagination" aria-label="Páginas de notificaciones">
                            <button type="button" className="module-secondary" onClick={() => cambiarPagina(Math.max(1, pagina - 1))} disabled={pagina <= 1}>
                                Anterior
                            </button>
                            <span>Página {paginacion.pagina} de {paginacion.ultima_pagina}</span>
                            <button type="button" className="module-secondary" onClick={() => cambiarPagina(Math.min(paginacion.ultima_pagina, pagina + 1))} disabled={pagina >= paginacion.ultima_pagina}>
                                Siguiente
                            </button>
                        </nav>
                    )}
                </>
            )}
        </section>
    );
}

export default NotificacionesPage;
