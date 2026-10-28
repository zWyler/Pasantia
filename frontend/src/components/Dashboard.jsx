import { useState } from 'react';
import './Dashboard.css';

const API_URL = 'http://127.0.0.1:8000/api';

function Dashboard({ usuario, cerrarSesion, actualizarUsuario }) {
const [editando, setEditando] = useState(false);
const [nombre, setNombre] = useState(usuario?.name || '');
const [correo, setCorreo] = useState(usuario?.email || '');
const [guardando, setGuardando] = useState(false);
const [mensaje, setMensaje] = useState('');
const [error, setError] = useState('');


const guardarPerfil = async (e) => {
    e.preventDefault();

    setGuardando(true);
    setMensaje('');
    setError('');

    try {
        const token = localStorage.getItem('token');

        const respuesta = await fetch(`${API_URL}/profile`, {
            method: 'PUT',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                name: nombre.trim(),
                email: correo.trim(),
            }),
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            if (respuesta.status === 422 && datos.errors) {
                const errores = Object.values(datos.errors).flat();
                throw new Error(errores.join(' '));
            }

            if (respuesta.status === 401) {
                throw new Error('Tu sesión ha expirado. Inicia sesión nuevamente.');
            }

            throw new Error(datos.message || 'No se pudo actualizar el perfil.');
        }

        actualizarUsuario(datos.user);
        setNombre(datos.user.name);
        setCorreo(datos.user.email);
        setEditando(false);
        setMensaje('Perfil actualizado correctamente.');
    } catch (err) {
        setError(err.message || 'Ocurrió un error al actualizar el perfil.');
    } finally {
        setGuardando(false);
    }
};

const cancelarEdicion = () => {
    setNombre(usuario?.name || '');
    setCorreo(usuario?.email || '');
    setEditando(false);
    setMensaje('');
    setError('');
};

return (
    <main className="dashboard-page">
        <section className="dashboard-card">
            <h1 className="dashboard-logo">
                Study<span>Hub</span>
            </h1>

            <h2>¡Bienvenido, {usuario?.name || 'estudiante'}!</h2>

            <p>Este es tu perfil de estudiante.</p>

            {editando ? (
                <form className="form-editar-perfil" onSubmit={guardarPerfil}>
                    <div>
                        <label htmlFor="nombre">Nombre</label>
                        <input
                            id="nombre"
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            maxLength={255}
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="correo">Correo electrónico</label>
                        <input
                            id="correo"
                            type="email"
                            value={correo}
                            onChange={(e) => setCorreo(e.target.value)}
                            maxLength={255}
                            required
                        />
                    </div>

                    {error && <p role="alert">{error}</p>}

                    <div className="acciones-editar-perfil">
    <button type="submit" className="btn-guardar-perfil" disabled={guardando}>
        {guardando ? 'Guardando...' : 'Guardar cambios'}
    </button>

    <button
        type="button"
        className="btn-cancelar-perfil"
        onClick={cancelarEdicion}
        disabled={guardando}
    >
        Cancelar
    </button>
</div>
                </form>
            ) : (
                <>
                    <p><strong>Nombre:</strong> {usuario?.name}</p>
                    <p className="dashboard-email">
                        <strong>Correo:</strong> {usuario?.email}
                    </p>

                    {mensaje && <p role="status">{mensaje}</p>}

                    <button
    type="button"
    className="btn-editar-perfil"
    onClick={() => {
    setNombre(usuario?.name || '');
    setCorreo(usuario?.email || '');
    setMensaje('');
    setError('');
    setEditando(true);
    }}
>
    Editar perfil
</button>
                </>
            )}

            <button
                type="button"
                className="dashboard-logout"
                onClick={cerrarSesion}
            >
                Cerrar sesión
            </button>
        </section>

        <p className="dashboard-copyright">
            StudyHub — Perfil del estudiante
        </p>
    </main>
);
}

export default Dashboard;