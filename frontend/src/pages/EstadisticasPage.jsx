import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api';
import { textoError } from '../utils/academic';
import '../styles/academic.css';
import '../styles/statistics.css';

const PERIODOS = [
    ['ultimos_7_dias', 'Últimos 7 días'],
    ['ultimos_30_dias', 'Últimos 30 días'],
    ['mes_actual', 'Mes actual'],
    ['todo', 'Todo el periodo'],
];

function BarraDistribucion({ titulo, elementos, className }) {
    const total = elementos.reduce((suma, elemento) => suma + elemento.cantidad, 0);

    return (
        <section className="statistics-panel" aria-labelledby={`${className}-heading`}>
            <div className="statistics-panel-heading">
                <h2 id={`${className}-heading`}>{titulo}</h2>
                <span>{total} tareas</span>
            </div>
            {total === 0 ? <p className="module-empty">No hay tareas para mostrar en este periodo.</p> : (
                <>
                    <div
                        className={`statistics-bar ${className}`}
                        role="img"
                        aria-label={elementos.map((elemento) => `${elemento.etiqueta}: ${elemento.cantidad} tareas, ${elemento.porcentaje}%`).join('. ')}
                    >
                        {elementos.map((elemento) => (
                            <span
                                key={elemento.clave}
                                className={`statistics-bar-segment ${elemento.clave}`}
                                style={{ width: `${elemento.porcentaje}%` }}
                            />
                        ))}
                    </div>
                    <ul className="statistics-legend">
                        {elementos.map((elemento) => (
                            <li key={elemento.clave}>
                                <span className={`statistics-legend-mark ${elemento.clave}`} aria-hidden="true" />
                                <span>{elemento.etiqueta}</span>
                                <strong>{elemento.cantidad} · {elemento.porcentaje}%</strong>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </section>
    );
}

function EstadisticasPage() {
    const [periodo, setPeriodo] = useState('todo');
    const [estadisticas, setEstadisticas] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const abortController = new AbortController();
        apiRequest(`/estadisticas?periodo=${encodeURIComponent(periodo)}`, {
            signal: abortController.signal,
        })
            .then(({ estadisticas: datos }) => setEstadisticas(datos))
            .catch((requestError) => {
                const mensaje = textoError(requestError);
                if (!mensaje) return;
                setEstadisticas(null);
                setError(mensaje);
            })
            .finally(() => {
                if (!abortController.signal.aborted) setCargando(false);
            });

        return () => abortController.abort();
    }, [periodo]);

    const cambiarPeriodo = (event) => {
        if (event.target.value === periodo) return;
        setPeriodo(event.target.value);
        setEstadisticas(null);
        setError('');
        setCargando(true);
    };

    return (
        <section className="module-page statistics-page">
            <header className="module-page-heading">
                <div>
                    <p className="module-eyebrow">Seguimiento académico</p>
                    <h1>Estadísticas</h1>
                    <p>Revisa la distribución y el progreso actual de tus tareas.</p>
                </div>
                <Link to="/tareas" className="module-secondary statistics-tasks-link">Ver tareas</Link>
            </header>

            <div className="statistics-filter">
                <label htmlFor="statistics-period">Periodo de creación de tareas</label>
                <select id="statistics-period" value={periodo} onChange={cambiarPeriodo}>
                    {PERIODOS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
                <p>Los filtros seleccionan tareas por su fecha de creación. Sus estados y vencimientos muestran la situación actual.</p>
            </div>

            {cargando && <p className="module-muted statistics-loading" role="status">Calculando tus estadísticas…</p>}
            {error && <p className="module-alert error" role="alert">No se pudieron cargar las estadísticas: {error}</p>}

            {!cargando && !error && estadisticas && (
                <>
                    <p className="statistics-period-description">{estadisticas.descripcion_periodo}</p>
                    <section className="statistics-summary" aria-label="Indicadores principales">
                        <article className="statistics-summary-card">
                            <span>Tareas en el periodo</span>
                            <strong>{estadisticas.total_tareas}</strong>
                        </article>
                        <article className="statistics-summary-card">
                            <span>Tasa de finalización</span>
                            <strong>{estadisticas.tasa_finalizacion.toFixed(1)}%</strong>
                            <small>Completadas / total del periodo</small>
                        </article>
                        <article className="statistics-summary-card overdue">
                            <span>Vencidas actualmente</span>
                            <strong>{estadisticas.tareas_vencidas}</strong>
                            <small>No completadas con fecha anterior a ahora</small>
                        </article>
                    </section>

                    {estadisticas.total_tareas === 0 && (
                        <p className="statistics-empty" role="status">
                            No hay tareas creadas en este periodo. Los porcentajes se muestran como 0% porque el total es cero.
                        </p>
                    )}

                    <div className="statistics-chart-grid">
                        <BarraDistribucion titulo="Distribución por estado" elementos={estadisticas.estados} className="states" />
                        <BarraDistribucion titulo="Distribución por prioridad" elementos={estadisticas.prioridades} className="priorities" />
                    </div>

                    <aside className="statistics-history-note" aria-labelledby="history-note-heading">
                        <h2 id="history-note-heading">Evolución histórica</h2>
                        <p>{estadisticas.evolucion.motivo}</p>
                    </aside>
                </>
            )}
        </section>
    );
}

export default EstadisticasPage;
