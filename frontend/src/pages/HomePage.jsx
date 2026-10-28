import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api';
import Dashboard from '../components/Dashboard';
import { fechaVisible, textoError } from '../utils/academic';
import '../styles/academic.css';
import './HomePage.css';

const ESTADOS = [
    { clave: 'tareas_pendientes', etiqueta: 'Pendientes', className: 'pending' },
    { clave: 'tareas_en_progreso', etiqueta: 'En progreso', className: 'progress' },
    { clave: 'tareas_completadas', etiqueta: 'Completadas', className: 'complete' },
];

function HomePage({ usuario, actualizarUsuario }) {
    const [resumen, setResumen] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const abortController = new AbortController();
        apiRequest('/dashboard/resumen', { signal: abortController.signal })
            .then(({ resumen: datos }) => setResumen(datos))
            .catch((requestError) => {
                const mensaje = textoError(requestError);
                if (mensaje) setError(mensaje);
            })
            .finally(() => {
                if (!abortController.signal.aborted) setCargando(false);
            });

        return () => abortController.abort();
    }, []);

    const valor = (dato) => {
        if (cargando) return '—';
        if (error || !Number.isFinite(dato)) return '—';
        return dato;
    };
    const distribucionCompleta = Boolean(
        resumen && ESTADOS.every((estado) => Number.isFinite(resumen[estado.clave]))
    );
    const totalEstados = distribucionCompleta
        ? ESTADOS.reduce((total, estado) => total + resumen[estado.clave], 0)
        : 0;
    const proximasEntregas = Array.isArray(resumen?.proximas_entregas)
        ? resumen.proximas_entregas
        : null;

    return (
        <div className="home-page">
            <header className="module-page-heading home-heading">
                <div>
                    <p className="module-eyebrow">Inicio</p>
                    <h1>Tu espacio de estudio</h1>
                    <p>Hola, {usuario?.name || 'estudiante'}. Aquí tienes un resumen de tu actividad académica.</p>
                </div>
            </header>

            {error && <p className="module-alert error" role="alert">No se pudo cargar el resumen: {error}</p>}

            <section className="summary-grid" aria-label="Resumen académico" aria-busy={cargando}>
                {[
                    ['Materias', resumen?.total_materias],
                    ['Tareas', resumen?.total_tareas],
                    ['Pendientes', resumen?.tareas_pendientes],
                    ['En progreso', resumen?.tareas_en_progreso],
                    ['Completadas', resumen?.tareas_completadas],
                    ['Vencidas', resumen?.tareas_vencidas],
                ].map(([label, value]) => (
                    <article className="summary-card" key={label}>
                        <span>{label}</span>
                        <strong>{valor(value)}</strong>
                    </article>
                ))}
            </section>

            {resumen && !error && resumen.total_materias === 0 && (
                <p className="home-onboarding" role="status">
                    Aún no tienes materias. Empieza creando una materia para organizar tus tareas.
                    {' '}<Link to="/materias">Crear mi primera materia</Link>
                </p>
            )}

            <div className="home-lower-grid">
                <section className="home-panel" aria-labelledby="upcoming-heading">
                    <div className="home-panel-heading">
                        <div>
                            <h2 id="upcoming-heading">Próximas entregas</h2>
                            <p>Entregas futuras no completadas, ordenadas por fecha.</p>
                        </div>
                    </div>
                    {cargando && <p className="home-empty" role="status">Cargando tus tareas…</p>}
                    {!cargando && error && <p className="home-empty">Las entregas no están disponibles mientras falla la consulta.</p>}
                    {!cargando && !error && resumen && !proximasEntregas && (
                        <p className="home-empty">La lista de entregas no está disponible.</p>
                    )}
                    {!cargando && !error && proximasEntregas?.length === 0 && (
                        <p className="home-empty">No hay próximas entregas con fecha registrada.</p>
                    )}
                    {!cargando && !error && proximasEntregas?.map((tarea) => (
                        <article className="upcoming-item" key={tarea.id}>
                            <span className={`upcoming-dot priority-${tarea.prioridad}`} aria-hidden="true" />
                            <div>
                                <Link to="/tareas" state={{ editTaskId: tarea.id }} className="upcoming-task-link">{tarea.titulo}</Link>
                                <span>{tarea.materia?.nombre || 'Materia'}</span>
                                <span className={`upcoming-status status-${tarea.estado}`}>{tarea.estado.replace('_', ' ')}</span>
                            </div>
                            <div className="upcoming-date">
                                <time dateTime={tarea.fecha_entrega}>{fechaVisible(tarea.fecha_entrega)}</time>
                                <span className={`priority-badge priority-${tarea.prioridad}`}>Prioridad {tarea.prioridad}</span>
                            </div>
                        </article>
                    ))}
                </section>

                <section className="home-panel" aria-labelledby="dashboard-status-heading">
                    <div className="home-panel-heading">
                        <div>
                            <h2 id="dashboard-status-heading">Distribución por estado</h2>
                            <p>Estado actual de las tareas registradas.</p>
                        </div>
                    </div>
                    {cargando && <p className="home-empty" role="status">Cargando distribución…</p>}
                    {!cargando && error && <p className="home-empty">La distribución no está disponible.</p>}
                    {!cargando && !error && resumen && (
                        !distribucionCompleta ? <p className="home-empty">No se recibió la distribución completa de tareas.</p>
                            : totalEstados === 0 ? <p className="home-empty">Aún no hay tareas para distribuir.</p> : (
                            <>
                                <div className="status-distribution" role="img" aria-label={ESTADOS.map((estado) => `${estado.etiqueta}: ${resumen[estado.clave]} de ${totalEstados}`).join('. ')}>
                                    {ESTADOS.map((estado) => (
                                        <span
                                            key={estado.clave}
                                            className={`status-distribution-segment ${estado.className}`}
                                            style={{ width: `${(resumen[estado.clave] / totalEstados) * 100}%` }}
                                        />
                                    ))}
                                </div>
                                <ul className="status-distribution-legend">
                                    {ESTADOS.map((estado) => (
                                        <li key={estado.clave}>
                                            <span className={`status-legend-mark ${estado.className}`} aria-hidden="true" />
                                            <span>{estado.etiqueta}</span>
                                            <strong>{resumen[estado.clave]} ({((resumen[estado.clave] / totalEstados) * 100).toFixed(1)}%)</strong>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )
                    )}
                </section>
            </div>

            <section className="home-panel home-quick-actions" aria-labelledby="quick-actions-heading">
                <div className="home-panel-heading">
                    <div>
                        <h2 id="quick-actions-heading">Accesos rápidos</h2>
                        <p>Continúa organizando tu actividad académica.</p>
                    </div>
                </div>
                <div className="quick-action-links">
                    <Link className="module-primary" to="/tareas">Crear tarea</Link>
                    <Link className="module-secondary" to="/materias">Consultar materias</Link>
                    <Link className="module-secondary" to="/calendario">Abrir calendario</Link>
                    <Link className="module-secondary" to="/tareas">Ver todas las tareas</Link>
                </div>
            </section>

            <Dashboard usuario={usuario} actualizarUsuario={actualizarUsuario} />
        </div>
    );
}

export default HomePage;
