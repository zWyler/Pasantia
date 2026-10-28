import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';
import {
    agruparTareasPorDia,
    diasDelCalendario,
    ESTADOS_TAREA,
    fechaLocalClave,
    fechaVisible,
    PRIORIDADES_TAREA,
    tareasSinFecha as filtrarTareasSinFecha,
    textoError,
    tituloMes,
    desplazarMes,
} from '../utils/academic';
import '../styles/academic.css';
import '../styles/calendar.css';

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const ESTADO_ABREVIADO = {
    pendiente: 'P',
    en_progreso: 'EP',
    completada: 'C',
};

function TareaCalendario({ tarea, onEditar }) {
    const nombreEstado = ESTADOS_TAREA.find(([valor]) => valor === tarea.estado)?.[1] || tarea.estado;
    const nombrePrioridad = PRIORIDADES_TAREA.find(([valor]) => valor === tarea.prioridad)?.[1] || tarea.prioridad;

    return (
        <article className="calendar-task-card">
            <div className="calendar-task-heading">
                <h3>{tarea.titulo}</h3>
                <span className={`priority-badge priority-${tarea.prioridad}`}>{nombrePrioridad}</span>
            </div>
            {tarea.descripcion && <p className="module-item-description">{tarea.descripcion}</p>}
            {tarea.materia?.nombre && <p className="module-task-subject">{tarea.materia.nombre}</p>}
            <div className="calendar-task-meta">
                <span className={`calendar-status status-${tarea.estado}`}>
                    <span aria-hidden="true">{ESTADO_ABREVIADO[tarea.estado] || '•'}</span>
                    {nombreEstado}
                </span>
                <span>{fechaVisible(tarea.fecha_entrega)}</span>
            </div>
            <button type="button" className="calendar-edit-button" onClick={() => onEditar(tarea)}>
                Ver o editar tarea
            </button>
        </article>
    );
}

function CalendarioPage() {
    const [mesActivo, setMesActivo] = useState(() => {
        const hoy = new Date();
        return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    });
    const [diaSeleccionado, setDiaSeleccionado] = useState(() => fechaLocalClave(new Date()));
    const [tareaSeleccionada, setTareaSeleccionada] = useState(null);
    const [tareas, setTareas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const abortController = new AbortController();

        apiRequest('/tareas?ordenar_por=fecha_entrega&direccion=asc', {
            signal: abortController.signal,
        })
            .then(({ tareas: lista }) => setTareas(lista))
            .catch((requestError) => {
                const mensaje = textoError(requestError);
                if (mensaje) setError(mensaje);
            })
            .finally(() => {
                if (!abortController.signal.aborted) setCargando(false);
            });

        return () => abortController.abort();
    }, []);

    const dias = useMemo(() => diasDelCalendario(mesActivo), [mesActivo]);
    const tareasPorDia = useMemo(() => agruparTareasPorDia(tareas), [tareas]);

    const tareasDelDia = tareasPorDia.get(diaSeleccionado) || [];
    const listaSinFecha = filtrarTareasSinFecha(tareas);
    const hoyClave = fechaLocalClave(new Date());
    const fechaSeleccionada = dias.find((dia) => dia.clave === diaSeleccionado)?.fecha
        || new Date(`${diaSeleccionado}T12:00:00`);
    const formatterDia = new Intl.DateTimeFormat('es', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    const seleccionarDia = (clave) => {
        setDiaSeleccionado(clave);
        setTareaSeleccionada(null);
        const fecha = new Date(`${clave}T12:00:00`);
        setMesActivo((actual) => (
            fecha.getFullYear() === actual.getFullYear() && fecha.getMonth() === actual.getMonth()
                ? actual
                : new Date(fecha.getFullYear(), fecha.getMonth(), 1)
        ));
    };

    const editarTarea = (tarea) => {
        navigate('/tareas', { state: { editTaskId: tarea.id } });
    };

    const cambiarMes = (cantidad) => {
        const nuevoMes = desplazarMes(mesActivo, cantidad);
        setMesActivo(nuevoMes);
        setDiaSeleccionado(fechaLocalClave(nuevoMes));
        setTareaSeleccionada(null);
    };

    return (
        <section className="module-page calendar-page">
            <header className="module-page-heading">
                <div>
                    <p className="module-eyebrow">Organización académica</p>
                    <h1>Calendario académico</h1>
                    <p>Consulta las tareas según su fecha de entrega local.</p>
                </div>
            </header>

            {error && <p className="module-alert error" role="alert">{error}</p>}

            <div className="calendar-toolbar" aria-label="Navegación del calendario">
                <div className="calendar-month-navigation">
                    <button type="button" className="module-secondary" aria-label="Mes anterior" onClick={() => cambiarMes(-1)}>‹</button>
                    <h2 aria-live="polite">{tituloMes(mesActivo)}</h2>
                    <button type="button" className="module-secondary" aria-label="Mes siguiente" onClick={() => cambiarMes(1)}>›</button>
                </div>
                <button
                    type="button"
                    className="module-secondary"
                    onClick={() => {
                        const hoy = new Date();
                        setMesActivo(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
                        seleccionarDia(fechaLocalClave(hoy));
                    }}
                >
                    Hoy
                </button>
            </div>

            {cargando && <p className="module-muted calendar-loading" role="status">Cargando tareas…</p>}

            <div className="calendar-workspace">
                <section className="calendar-panel" aria-label={`Calendario de ${tituloMes(mesActivo)}`}>
                    <div className="calendar-grid calendar-weekdays" aria-hidden="true">
                        {DIAS_SEMANA.map((dia) => <span key={dia}>{dia}</span>)}
                    </div>
                    <div className="calendar-grid calendar-days" role="grid" aria-label={tituloMes(mesActivo)}>
                        {dias.map(({ fecha, clave, perteneceAlMes }) => {
                            const tareasDia = tareasPorDia.get(clave) || [];
                            const seleccionado = clave === diaSeleccionado;
                            const esHoy = clave === hoyClave;

                            return (
                                <div
                                    className={`calendar-day ${perteneceAlMes ? '' : 'outside-month'} ${seleccionado ? 'selected' : ''} ${esHoy ? 'is-today' : ''}`}
                                    key={clave}
                                    role="gridcell"
                                    aria-selected={seleccionado}
                                >
                                    <button
                                        type="button"
                                        className="calendar-day-button"
                                        aria-pressed={seleccionado}
                                        aria-label={`${formatterDia.format(fecha)}${tareasDia.length ? `, ${tareasDia.length} tareas` : ', sin tareas'}`}
                                        onClick={() => seleccionarDia(clave)}
                                    >
                                        <span>{fecha.getDate()}</span>
                                        {esHoy && <span className="calendar-today-label">Hoy</span>}
                                    </button>
                                    <div className="calendar-day-tasks">
                                        {tareasDia.slice(0, 2).map((tarea) => (
                                            <button
                                                type="button"
                                                key={tarea.id}
                                                className={`calendar-task-indicator status-${tarea.estado} ${tareaSeleccionada === tarea.id ? 'focused' : ''}`}
                                                title={`${tarea.titulo} · ${tarea.estado} · prioridad ${tarea.prioridad}`}
                                                aria-label={`Ver ${tarea.titulo}; estado ${tarea.estado}; prioridad ${tarea.prioridad}`}
                                                onClick={() => {
                                                    seleccionarDia(clave);
                                                    setTareaSeleccionada(tarea.id);
                                                }}
                                            >
                                                <span className="calendar-indicator-state" aria-hidden="true">{ESTADO_ABREVIADO[tarea.estado] || '•'}</span>
                                                <span className="calendar-indicator-title">{tarea.titulo}</span>
                                                <span className={`calendar-priority-dot priority-${tarea.prioridad}`} aria-hidden="true">{tarea.prioridad === 'alta' ? '!' : tarea.prioridad === 'media' ? '◆' : '·'}</span>
                                            </button>
                                        ))}
                                        {tareasDia.length > 2 && (
                                            <button type="button" className="calendar-more-tasks" onClick={() => seleccionarDia(clave)}>
                                                +{tareasDia.length - 2} más
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <aside className="calendar-detail-panel" aria-labelledby="calendar-detail-heading">
                    <div className="calendar-detail-heading">
                        <p className="module-eyebrow">Detalle del día</p>
                        <h2 id="calendar-detail-heading">{formatterDia.format(fechaSeleccionada)}</h2>
                    </div>
                    {!cargando && !error && tareasDelDia.length === 0 && (
                        <p className="module-empty">No hay tareas con fecha de entrega para este día.</p>
                    )}
                    <div className="calendar-detail-list" aria-live="polite">
                        {tareasDelDia.map((tarea) => (
                            <div className={tareaSeleccionada === tarea.id ? 'calendar-task-selected' : ''} key={tarea.id}>
                                <TareaCalendario tarea={tarea} onEditar={editarTarea} />
                            </div>
                        ))}
                    </div>
                </aside>
            </div>

            <section className="calendar-unscheduled-panel" aria-labelledby="unscheduled-heading">
                <div className="calendar-unscheduled-heading">
                    <div>
                        <p className="module-eyebrow">Sin fecha asignada</p>
                        <h2 id="unscheduled-heading">Tareas sin fecha de entrega</h2>
                    </div>
                    <span className="calendar-unscheduled-count">{listaSinFecha.length}</span>
                </div>
                {cargando && <p className="module-muted">Cargando tareas…</p>}
                {!cargando && !error && listaSinFecha.length === 0 && (
                    <p className="module-empty">No tienes tareas sin fecha de entrega.</p>
                )}
                {listaSinFecha.length > 0 && (
                    <div className="calendar-unscheduled-list">
                        {listaSinFecha.map((tarea) => (
                            <TareaCalendario key={tarea.id} tarea={tarea} onEditar={editarTarea} />
                        ))}
                    </div>
                )}
                {!cargando && !error && tareas.length === 0 && (
                    <p className="module-empty">Aún no tienes tareas. Puedes crear una desde el módulo Tareas.</p>
                )}
            </section>
        </section>
    );
}

export default CalendarioPage;
