import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api';
import { textoError } from '../utils/academic';
import './Register.css';

function Register() {
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmarPassword, setConfirmarPassword] = useState('');

    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

    const [mensaje, setMensaje] = useState('');
    const [tipoMensaje, setTipoMensaje] = useState('');
    const [cargando, setCargando] = useState(false);

    const registrarUsuario = async (e) => {
        e.preventDefault();

        setMensaje('');
        setTipoMensaje('');

        if (password.length < 8) {
            setMensaje('La contraseña debe tener al menos 8 caracteres.');
            setTipoMensaje('error');
            return;
        }

        if (password !== confirmarPassword) {
            setMensaje('Las contraseñas no coinciden.');
            setTipoMensaje('error');
            return;
        }

        setCargando(true);

        try {
            const datos = await apiRequest('/register', {
                method: 'POST',
                body: {
                    name: nombre.trim(),
                    email: email.trim(),
                    password,
                },
            });

            setMensaje(
                datos.message || '¡Tu cuenta se ha creado correctamente!'
            );
            setTipoMensaje('exito');

            setNombre('');
            setEmail('');
            setPassword('');
            setConfirmarPassword('');
        } catch (error) {
            setMensaje(textoError(error));
            setTipoMensaje('error');
        } finally {
            setCargando(false);
        }
    };

    return (
        <main className="register-page">
            <section className="register-card">
                <header className="register-header">
                    <div className="register-brand-icon" aria-hidden="true">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
                            <path d="M4 5.5v15A2.5 2.5 0 0 1 6.5 18H20" />
                            <path d="M9 7h7M9 11h7" />
                        </svg>
                    </div>

                    <h1 className="register-logo">
                        Study<span>Hub</span>
                    </h1>

                    <p className="register-slogan">
                        Organiza, aprende y sube de nivel.
                    </p>
                </header>

                <div className="register-intro">
                    <p className="register-eyebrow">
                        COMIENZA TU EXPERIENCIA
                    </p>

                    <h2>Crea tu cuenta</h2>

                    <p className="register-description">
                        Da el primer paso para organizar tus estudios y
                        alcanzar tus metas académicas.
                    </p>
                </div>

                <form onSubmit={registrarUsuario}>
                    <div className="register-field">
                        <label htmlFor="register-name">
                            Nombre
                        </label>

                        <input
                            id="register-name"
                            type="text"
                            placeholder="Escribe tu nombre"
                            autoComplete="name"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            maxLength={255}
                            required
                        />
                    </div>

                    <div className="register-field">
                        <label htmlFor="register-email">
                            Correo electrónico
                        </label>

                        <input
                            id="register-email"
                            type="email"
                            placeholder="tu@correo.com"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            maxLength={255}
                            required
                        />
                    </div>

                    <div className="register-field">
                        <label htmlFor="register-password">
                            Contraseña
                        </label>

                        <div className="register-password-input">
                            <input
                                id="register-password"
                                type={mostrarPassword ? 'text' : 'password'}
                                placeholder="Mínimo 8 caracteres"
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) =>
                                    setPassword(e.target.value)
                                }
                                minLength={8}
                                required
                            />

                            <button
                                type="button"
                                className="register-toggle-password"
                                onClick={() =>
                                    setMostrarPassword((anterior) => !anterior)
                                }
                                aria-label={
                                    mostrarPassword
                                        ? 'Ocultar contraseña'
                                        : 'Mostrar contraseña'
                                }
                            >
                                {mostrarPassword ? 'Ocultar' : 'Mostrar'}
                            </button>
                        </div>


                    </div>

                    <div className="register-field">
                        <label htmlFor="register-confirm-password">
                            Confirmar contraseña
                        </label>

                        <div className="register-password-input">
                            <input
                                id="register-confirm-password"
                                type={
                                    mostrarConfirmacion ? 'text' : 'password'
                                }
                                placeholder="Escribe tu contraseña nuevamente"
                                autoComplete="new-password"
                                value={confirmarPassword}
                                onChange={(e) =>
                                    setConfirmarPassword(e.target.value)
                                }
                                required
                            />


                            <button
                                type="button"
                                className="register-toggle-password"
                                onClick={() =>
                                    setMostrarConfirmacion(
                                        (anterior) => !anterior
                                    )
                                }
                                aria-label={
                                    mostrarConfirmacion
                                        ? 'Ocultar confirmación'
                                        : 'Mostrar confirmación'
                                }
                            >
                                {mostrarConfirmacion ? 'Ocultar' : 'Mostrar'}
                            </button>
                        </div>
                    </div>

                    {mensaje && (
                        <div
                            className={`register-alert ${tipoMensaje}`}
                            role={tipoMensaje === 'error' ? 'alert' : 'status'}
                            aria-live="polite"
                        >
                            <span
                                className="register-alert-icon"
                                aria-hidden="true"
                            >
                                {tipoMensaje === 'error' ? '!' : '✓'}
                            </span>

                            <p>{mensaje}</p>
                        </div>
                    )}

                    <button
                        className="register-button"
                        type="submit"
                        disabled={cargando}
                    >
                        {cargando
                            ? 'Creando cuenta...'
                            : 'Crear mi cuenta'}
                    </button>
                </form>

                <footer className="register-footer">
                    <p>
                        ¿Ya tienes una cuenta?{' '}
                        <Link to="/">Inicia sesión</Link>
                    </p>
                </footer>
            </section>

            <p className="register-copyright">
                © {new Date().getFullYear()} StudyHub. Todos los derechos
                reservados.
            </p>
        </main>
    );
}

export default Register;
