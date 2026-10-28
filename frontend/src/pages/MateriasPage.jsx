import { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import { textoError } from '../utils/academic';
import '../styles/academic.css';

const FORMULARIO_VACIO = { nombre: '', descripcion: '' };

function MateriasPage() {
    const [materias, setMaterias] = useState([]);
    const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
    const [materiaEnEdicion, setMateriaEnEdicion] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [eliminandoId, setEliminandoId] = useState(null);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    useEffect(() => {
        let activo = true;

        apiRequest('/materias')
            .then(({ materias: lista }) => {
                if (activo) setMaterias(lista);
            })
            .catch((requestError) => {
                if (activo) setError(textoError(requestError));
            })
            .finally(() => {
                if (activo) setCargando(false);
            });

        return () => { activo = false; };
    }, []);

    const guardar = async (event) => {
        event.preventDefault();
        setError('');
        setMensaje('');
        setGuardando(true);

        const datos = {
            nombre: formulario.nombre.trim(),
            descripcion: formulario.descripcion.trim() || null,
        };

        try {
            if (materiaEnEdicion) {
                const { materia } = await apiRequest(`/materias/${materiaEnEdicion}`, {
                    method: 'PUT',
                    body: datos,
                });
                setMaterias((actuales) => actuales
                    .map((item) => item.id === materia.id ? materia : item)
                    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
                setMensaje('Materia actualizada correctamente.');
            } else {
                const { materia } = await apiRequest('/materias', {
                    method: 'POST',
                    body: datos,
                });
                setMaterias((actuales) => [...actuales, materia]
                    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')));
                setMensaje('Materia creada correctamente.');
            }

            setFormulario(FORMULARIO_VACIO);
            setMateriaEnEdicion(null);
        } catch (requestError) {
            setError(textoError(requestError));
        } finally {
            setGuardando(false);
        }
    };

    const editar = (materia) => {
        setMateriaEnEdicion(materia.id);
        setFormulario({
            nombre: materia.nombre,
            descripcion: materia.descripcion || '',
        });
        setError('');
        setMensaje('');
    };

    const cancelar = () => {
        setMateriaEnEdicion(null);
        setFormulario(FORMULARIO_VACIO);
        setError('');
    };

    const eliminar = async (materia) => {
        if (!window.confirm(`¿Eliminar “${materia.nombre}” y todas sus tareas? Esta acción no se puede deshacer.`)) {
            return;
        }

        setError('');
        setMensaje('');
        setEliminandoId(materia.id);

        try {
            await apiRequest(`/materias/${materia.id}`, { method: 'DELETE' });
            setMaterias((actuales) => actuales.filter((item) => item.id !== materia.id));
            if (materiaEnEdicion === materia.id) cancelar();
            setMensaje('Materia y tareas eliminadas correctamente.');
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
                    <h1>Materias</h1>
                    <p>Administra tus asignaturas y los detalles de cada una.</p>
                </div>
            </header>

            {error && <p className="module-alert error" role="alert">{error}</p>}
            {mensaje && <p className="module-alert success" role="status">{mensaje}</p>}

            <div className="module-layout">
                <section className="module-panel" aria-labelledby="materia-form-heading">
                    <h2 id="materia-form-heading">{materiaEnEdicion ? 'Editar materia' : 'Nueva materia'}</h2>
                    <p className="module-panel-subtitle">El nombre debe ser único dentro de tu cuenta.</p>
                    <form className="academic-form" onSubmit={guardar}>
                        <label htmlFor="materia-nombre">Nombre</label>
                        <input
                            id="materia-nombre"
                            value={formulario.nombre}
                            onChange={(event) => setFormulario({ ...formulario, nombre: event.target.value })}
                            maxLength={100}
                            required
                            placeholder="Ej. Biología"
                        />
                        <label htmlFor="materia-descripcion">Descripción <span>(opcional)</span></label>
                        <textarea
                            id="materia-descripcion"
                            value={formulario.descripcion}
                            onChange={(event) => setFormulario({ ...formulario, descripcion: event.target.value })}
                            maxLength={5000}
                            rows={4}
                            placeholder="Aula, docente u otros detalles"
                        />
                        <div className="form-actions">
                            <button className="module-primary" disabled={guardando}>
                                {guardando ? 'Guardando…' : materiaEnEdicion ? 'Guardar cambios' : 'Crear materia'}
                            </button>
                            {materiaEnEdicion && (
                                <button type="button" className="module-secondary" onClick={cancelar}>Cancelar</button>
                            )}
                        </div>
                    </form>
                </section>

                <section className="module-panel" aria-labelledby="materias-list-heading">
                    <h2 id="materias-list-heading">Tus materias</h2>
                    <p className="module-panel-subtitle">{materias.length} {materias.length === 1 ? 'registrada' : 'registradas'}</p>
                    <div className="module-items" aria-live="polite">
                        {cargando && <p className="module-muted">Cargando materias…</p>}
                        {!cargando && !error && materias.length === 0 && (
                            <p className="module-empty">Todavía no has registrado materias.</p>
                        )}
                        {materias.map((materia) => (
                            <article className="module-item" key={materia.id}>
                                <h3>{materia.nombre}</h3>
                                <p className="module-item-description">{materia.descripcion || 'Sin descripción'}</p>
                                <div className="module-item-actions">
                                    <button type="button" onClick={() => editar(materia)}>Editar</button>
                                    <button
                                        type="button"
                                        className="danger-text"
                                        onClick={() => eliminar(materia)}
                                        disabled={eliminandoId === materia.id}
                                    >
                                        {eliminandoId === materia.id ? 'Eliminando…' : 'Eliminar'}
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

export default MateriasPage;
