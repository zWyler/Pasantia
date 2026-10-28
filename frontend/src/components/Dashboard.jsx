import { useState } from 'react';
import { apiRequest } from '../api';
import './Dashboard.css';

function Dashboard({ usuario, actualizarUsuario }) {
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
        const datos = await apiRequest('/profile', {
            method: 'PUT',
            body: {
                name: nombre.trim(),
                email: correo.trim(),
            },
        });

        actualizarUsuario(datos.user);
        setNombre(datos.user.name);
        setCorreo(datos.user.email);
        setEditando(false);
        setMensaje('Perfil actualizado correctamente.');
    } catch (err) {
        setError(err.status === 401
            ? 'Tu sesión ha expirado. Inicia sesión nuevamente.'
            : err.message || 'Ocurrió un error al actualizar el perfil.');
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
        <section className="dashboard-card profile-card" aria-labelledby="profile-heading">
            <h2 id="profile-heading">Perfil del estudiante</h2>
            <p className="profile-intro">Consulta y actualiza los datos de tu cuenta.</p>

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

        </section>
);
}

export default Dashboard;
