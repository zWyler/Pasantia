import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api';
import {
    ESTADOS_TAREA,
    fechaParaApi,
    fechaParaFormulario,
    fechaVisible,
    PRIORIDADES_TAREA,
    textoError,
} from '../utils/academic';
import '../styles/academic.css';

const TAREA_VACIA = {
    titulo: '',
    descripcion: '',
    estado: 'pendiente',
    fecha_entrega: '',
    prioridad: 'media',
};

const FILTROS_POR_DEFECTO = {
    q: '',
    materia_id: '',
    estado: '',
    prioridad: '',
    fecha_desde: '',
    fecha_hasta: '',
    ordenar_por: 'fecha_entrega',
    direccion: 'asc',
};

function TareasPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [materias, setMaterias] = useState([]);
    const [materiaId, setMateriaId] = useState('');
    const [tareas, setTareas] = useState([]);
    const [textoBusqueda, setTextoBusqueda] = useState('');
    const [filtros, setFiltros] = useState(FILTROS_POR_DEFECTO);
    const [refrescar, setRefrescar] = useState(0);
    const [formulario, setFormulario] = useState(TAREA_VACIA);
    const [tareaEnEdicion, setTareaEnEdicion] = useState(null);
    const [cargandoMaterias, setCargandoMaterias] = useState(true);
    const [cargandoTareas, setCargandoTareas] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [actualizandoEstadoId, setActualizandoEstadoId] = useState(null);
    const [eliminandoId, setEliminandoId] = useState(null);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    useEffect(() => {
        const temporizador = window.setTimeout(() => {
            setFiltros((actuales) => ({ ...actuales, q: textoBusqueda.trim() }));
        }, 300);

        return () => window.clearTimeout(temporizador);
    }, [textoBusqueda]);

    const materiaActual = materias.find((materia) => String(materia.id) === String(materiaId));
    const hayFiltrosActivos = Boolean(
        textoBusqueda.trim()
        || filtros.materia_id
        || filtros.estado
        || filtros.prioridad
        || filtros.fecha_desde
        || filtros.fecha_hasta
        || filtros.ordenar_por !== 'fecha_entrega'
        || filtros.direccion !== 'asc'
    );

    const cambiarFiltro = (campo, valor) => {
        setFiltros((actuales) => ({ ...actuales, [campo]: valor }));
        setError('');
    };

    const limpiarFiltros = () => {
        setTextoBusqueda('');
        setFiltros({ ...FILTROS_POR_DEFECTO });
        setError('');
    };

    useEffect(() => {
        let activo = true;

        apiRequest('/materias')
            .then(({ materias: lista }) => {
                if (!activo) return;
                setMaterias(lista);
                if (lista[0]) {
                    setMateriaId(lista[0].id);
                }
            })
            .catch((requestError) => {
                if (activo) setError(textoError(requestError));
            })
            .finally(() => {
                if (activo) setCargandoMaterias(false);
            });

        return () => { activo = false; };
    }, []);

    useEffect(() => {
        const abortController = new AbortController();
        const indicadorCarga = window.setTimeout(() => {
            setCargandoTareas(true);
            setError('');
        }, 0);
        const parametros = new URLSearchParams();
        Object.entries(filtros).forEach(([campo, valor]) => {
            if (valor) parametros.set(campo, valor);
        });
        if (filtros.fecha_desde || filtros.fecha_hasta) {
            parametros.set('zona_horaria', Intl.DateTimeFormat().resolvedOptions().timeZone);
        }

        apiRequest(`/tareas?${parametros.toString()}`, { signal: abortController.signal })
            .then(({ tareas: lista }) => setTareas(lista))
            .catch((requestError) => {
                const mensajeError = textoError(requestError);
                if (mensajeError) {
                    setTareas([]);
                    setError(mensajeError);
                }
            })
            .finally(() => {
                window.clearTimeout(indicadorCarga);
                if (!abortController.signal.aborted) setCargandoTareas(false);
            });

        return () => {
            window.clearTimeout(indicadorCarga);
            abortController.abort();
        };
    }, [filtros, refrescar]);

    const seleccionarMateria = (id) => {
        setMateriaId(id);
        setError('');
        setMensaje('');
        cancelarEdicion();
    };

    const guardar = async (event) => {
        event.preventDefault();
        if (!materiaActual) return;

        setError('');
        setMensaje('');
        setGuardando(true);
        const datos = {
            titulo: formulario.titulo.trim(),
            descripcion: formulario.descripcion.trim() || null,
            estado: formulario.estado,
            prioridad: formulario.prioridad,
            fecha_entrega: fechaParaApi(formulario.fecha_entrega),
        };

        try {
            if (tareaEnEdicion) {
                const { tarea } = await apiRequest(`/tareas/${tareaEnEdicion}`, {
                    method: 'PATCH',
                    body: datos,
                });
                setTareas((actuales) => actuales.map((item) => (
                    item.id === tarea.id ? tarea : item
                )));
                setRefrescar((actual) => actual + 1);
                setMensaje('Tarea actualizada correctamente.');
            } else {
                const { tarea } = await apiRequest(`/materias/${materiaActual.id}/tareas`, {
                    method: 'POST',
                    body: datos,
                });
                setTareas((actuales) => [...actuales, tarea]);
                setRefrescar((actual) => actual + 1);
                setMensaje('Tarea creada correctamente.');
            }

            setFormulario(TAREA_VACIA);
            setTareaEnEdicion(null);
        } catch (requestError) {
            setError(textoError(requestError));
        } finally {
            setGuardando(false);
        }
    };

    function cancelarEdicion() {
        setTareaEnEdicion(null);
        setFormulario(TAREA_VACIA);
    }

    const editar = (tarea) => {
        setTareaEnEdicion(tarea.id);
        setFormulario({
            titulo: tarea.titulo,
            descripcion: tarea.descripcion || '',
            estado: tarea.estado,
            fecha_entrega: fechaParaFormulario(tarea.fecha_entrega),
            prioridad: tarea.prioridad,
        });
        setError('');
        setMensaje('');
    };

    useEffect(() => {
        const tareaId = location.state?.editTaskId;
        if (!tareaId || cargandoTareas) return;

        const temporizador = window.setTimeout(() => {
            const tarea = tareas.find((item) => String(item.id) === String(tareaId));
            navigate(location.pathname, { replace: true, state: null });

            if (!tarea) {
                setError('No se encontró esa tarea en tu lista.');
                return;
            }

            setFiltros({ ...FILTROS_POR_DEFECTO });
            setTextoBusqueda('');
            setMateriaId(tarea.materia_id);
            setTareaEnEdicion(tarea.id);
            setFormulario({
                titulo: tarea.titulo,
                descripcion: tarea.descripcion || '',
                estado: tarea.estado,
                fecha_entrega: fechaParaFormulario(tarea.fecha_entrega),
                prioridad: tarea.prioridad,
            });
            setError('');
            setMensaje('Tarea abierta desde el calendario.');
        }, 0);

        return () => window.clearTimeout(temporizador);
    }, [cargandoTareas, location.pathname, location.state, navigate, tareas]);

    const cambiarEstado = async (tarea, estado) => {
        setError('');
        setMensaje('');
        setActualizandoEstadoId(tarea.id);

        try {
            const { tarea: actualizada } = await apiRequest(`/tareas/${tarea.id}`, {
                method: 'PATCH',
                body: { estado },
            });
            setTareas((actuales) => actuales.map((item) => (
                item.id === actualizada.id ? actualizada : item
            )));
            setRefrescar((actual) => actual + 1);
            setMensaje('Estado actualizado correctamente.');
        } catch (requestError) {
            setError(textoError(requestError));
        } finally {
            setActualizandoEstadoId(null);
        }
    };

    const eliminar = async (tarea) => {
        if (!window.confirm(`¿Eliminar la tarea “${tarea.titulo}”?`)) return;

        setError('');
        setMensaje('');
        setEliminandoId(tarea.id);
        try {
            await apiRequest(`/tareas/${tarea.id}`, { method: 'DELETE' });
            setTareas((actuales) => actuales.filter((item) => item.id !== tarea.id));
            setRefrescar((actual) => actual + 1);
            if (tareaEnEdicion === tarea.id) cancelarEdicion();
            setMensaje('Tarea eliminada correctamente.');
        } catch (requestError) {
            setError(textoError(requestError));
        } finally {
            setEliminandoId(null);
        }
    };

    return (
        <section className="module-page">
            <header className="module-page-heading">
                <div>
                    <p className="module-eyebrow">Organización académica</p>
                    <h1>Tareas</h1>
                    <p>Controla el estado, la fecha de entrega y la prioridad de cada actividad.</p>
                </div>
            </header>

            {error && <p className="module-alert error" role="alert">{error}</p>}
            {mensaje && <p className="module-alert success" role="status">{mensaje}</p>}

            <div className="module-layout">
                <section className="module-panel" aria-labelledby="task-form-heading">
                    <h2 id="task-form-heading">{tareaEnEdicion ? 'Editar tarea' : 'Nueva tarea'}</h2>
                    <p className="module-panel-subtitle">Las tareas se guardan dentro de la materia seleccionada.</p>

                    <div className="academic-form task-materia-selector">
                        <label htmlFor="tarea-materia">Materia</label>
                        <select
                            id="tarea-materia"
                            value={materiaId}
                            onChange={(event) => seleccionarMateria(event.target.value)}
                            disabled={cargandoMaterias || materias.length === 0}
                        >
                            <option value="">Selecciona una materia</option>
                            {materias.map((materia) => (
                                <option value={materia.id} key={materia.id}>{materia.nombre}</option>
                            ))}
                        </select>
                    </div>

                    {cargandoMaterias && <p className="module-muted">Cargando materias…</p>}
                    {!cargandoMaterias && materias.length === 0 && (
                        <p className="module-empty">Crea primero una materia en el módulo Materias.</p>
                    )}

                    {materiaActual && (
                        <form className="academic-form" onSubmit={guardar}>
                            <label htmlFor="tarea-titulo">Título</label>
                            <input
                                id="tarea-titulo"
                                value={formulario.titulo}
                                onChange={(event) => setFormulario({ ...formulario, titulo: event.target.value })}
                                maxLength={150}
                                required
                                placeholder="Ej. Leer capítulo 4"
                            />

                            <label htmlFor="tarea-descripcion">Descripción <span>(opcional)</span></label>
                            <textarea
                                id="tarea-descripcion"
                                value={formulario.descripcion}
                                onChange={(event) => setFormulario({ ...formulario, descripcion: event.target.value })}
                                maxLength={5000}
                                rows={3}
                                placeholder="Instrucciones o notas"
                            />

                            <div className="task-form-grid">
                                <div>
                                    <label htmlFor="tarea-fecha">Fecha de entrega <span>(opcional)</span></label>
                                    <input
                                        id="tarea-fecha"
                                        type="datetime-local"
                                        value={formulario.fecha_entrega}
                                        onChange={(event) => setFormulario({ ...formulario, fecha_entrega: event.target.value })}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="tarea-prioridad">Prioridad</label>
                                    <select
                                        id="tarea-prioridad"
                                        value={formulario.prioridad}
                                        onChange={(event) => setFormulario({ ...formulario, prioridad: event.target.value })}
                                    >
                                        {PRIORIDADES_TAREA.map(([value, label]) => (
                                            <option value={value} key={value}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <label htmlFor="tarea-estado">Estado</label>
                            <select
                                id="tarea-estado"
                                value={formulario.estado}
                                onChange={(event) => setFormulario({ ...formulario, estado: event.target.value })}
                            >
                                {ESTADOS_TAREA.map(([value, label]) => (
                                    <option value={value} key={value}>{label}</option>
                                ))}
                            </select>

                            <div className="form-actions">
                                <button className="module-primary" disabled={guardando}>
                                    {guardando ? 'Guardando…' : tareaEnEdicion ? 'Guardar cambios' : 'Crear tarea'}
                                </button>
                                {tareaEnEdicion && (
                                    <button type="button" className="module-secondary" onClick={cancelarEdicion}>Cancelar</button>
                                )}
                            </div>
                        </form>
                    )}
                </section>

                <section className="module-panel" aria-labelledby="tasks-list-heading">
                    <h2 id="tasks-list-heading">Tareas académicas</h2>
                    <p className="module-panel-subtitle">Busca y combina filtros para encontrar tus tareas.</p>
                    <div className="task-filters" aria-label="Filtros de tareas">
                        <div className="task-search-field">
                            <label htmlFor="filtro-busqueda">Buscar</label>
                            <input
                                id="filtro-busqueda"
                                type="search"
                                value={textoBusqueda}
                                onChange={(event) => setTextoBusqueda(event.target.value)}
                                maxLength={150}
                                placeholder="Título o descripción"
                            />
                        </div>
                        <div className="task-filter-grid">
                            <div>
                                <label htmlFor="filtro-materia">Materia</label>
                                <select id="filtro-materia" value={filtros.materia_id} onChange={(event) => cambiarFiltro('materia_id', event.target.value)}>
                                    <option value="">Todas las materias</option>
                                    {materias.map((materia) => (
                                        <option value={materia.id} key={materia.id}>{materia.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="filtro-estado">Estado</label>
                                <select id="filtro-estado" value={filtros.estado} onChange={(event) => cambiarFiltro('estado', event.target.value)}>
                                    <option value="">Todos</option>
                                    {ESTADOS_TAREA.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="filtro-prioridad">Prioridad</label>
                                <select id="filtro-prioridad" value={filtros.prioridad} onChange={(event) => cambiarFiltro('prioridad', event.target.value)}>
                                    <option value="">Todas</option>
                                    {PRIORIDADES_TAREA.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="filtro-fecha-desde">Entrega desde</label>
                                <input id="filtro-fecha-desde" type="date" value={filtros.fecha_desde} onChange={(event) => cambiarFiltro('fecha_desde', event.target.value)} />
                            </div>
                            <div>
                                <label htmlFor="filtro-fecha-hasta">Entrega hasta</label>
                                <input id="filtro-fecha-hasta" type="date" value={filtros.fecha_hasta} onChange={(event) => cambiarFiltro('fecha_hasta', event.target.value)} />
                            </div>
                            <div>
                                <label htmlFor="filtro-orden">Ordenar por</label>
                                <select id="filtro-orden" value={filtros.ordenar_por} onChange={(event) => cambiarFiltro('ordenar_por', event.target.value)}>
                                    <option value="fecha_entrega">Fecha de entrega</option>
                                    <option value="prioridad">Prioridad</option>
                                    <option value="titulo">Título</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="filtro-direccion">Dirección</label>
                                <select id="filtro-direccion" value={filtros.direccion} onChange={(event) => cambiarFiltro('direccion', event.target.value)}>
                                    <option value="asc">Ascendente</option>
                                    <option value="desc">Descendente</option>
                                </select>
                            </div>
                        </div>
                        <button type="button" className="module-secondary task-clear-filters" onClick={limpiarFiltros} disabled={!hayFiltrosActivos}>
                            Limpiar filtros
                        </button>
                    </div>
                    <div className="module-items" aria-live="polite">
                        {cargandoTareas && <p className="module-muted">Cargando tareas…</p>}
                        {!cargandoTareas && !error && tareas.length === 0 && (
                            <p className="module-empty">{hayFiltrosActivos ? 'No hay tareas que coincidan con estos filtros.' : 'Todavía no hay tareas.'}</p>
                        )}
                        {tareas.map((tarea) => (
                            <article className="module-item" key={tarea.id}>
                                <div className="module-item-top">
                                    <div>
                                        <h3>{tarea.titulo}</h3>
                                        {tarea.descripcion && <p className="module-item-description">{tarea.descripcion}</p>}
                                        {tarea.materia?.nombre && <p className="module-task-subject">{tarea.materia.nombre}</p>}
                                    </div>
                                    <span className={`priority-badge priority-${tarea.prioridad}`}>
                                        Prioridad {tarea.prioridad}
                                    </span>
                                </div>
                                <div className="module-item-meta">
                                    <time dateTime={tarea.fecha_entrega || undefined}>{fechaVisible(tarea.fecha_entrega)}</time>
                                    <label>
                                        <span className="visually-hidden">Estado de {tarea.titulo}</span>
                                        <select
                                            value={tarea.estado}
                                            disabled={actualizandoEstadoId === tarea.id}
                                            onChange={(event) => cambiarEstado(tarea, event.target.value)}
                                        >
                                            {ESTADOS_TAREA.map(([value, label]) => (
                                                <option value={value} key={value}>{label}</option>
                                            ))}
                                        </select>
                                    </label>
                                </div>
                                <div className="module-item-actions">
                                    <button type="button" onClick={() => editar(tarea)}>Editar</button>
                                    <button
                                        type="button"
                                        className="danger-text"
                                        disabled={eliminandoId === tarea.id}
                                        onClick={() => eliminar(tarea)}
                                    >
                                        {eliminandoId === tarea.id ? 'Eliminando…' : 'Eliminar'}
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </section>
    );
}

export default TareasPage;
