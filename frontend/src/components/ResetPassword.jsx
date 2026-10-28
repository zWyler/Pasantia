import { useEffect, useState } from 'react';
import './ResetPassword.css';

function ResetPassword() {
    const parametros = new URLSearchParams(window.location.search);
    const token = parametros.get('token') || '';
    const emailInicial = parametros.get('email') || '';

    const [email, setEmail] = useState(emailInicial);
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');

    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

    const [mensaje, setMensaje] = useState('');
    const [tipoMensaje, setTipoMensaje] = useState('');
    const [cargando, setCargando] = useState(false);
    const [restablecimientoExitoso, setRestablecimientoExitoso] =
        useState(false);

    useEffect(() => {
        if (!restablecimientoExitoso) {
            return;
        }

        const temporizador = setTimeout(() => {
            window.location.href = '/';
        }, 3000);

        return () => clearTimeout(temporizador);
    }, [restablecimientoExitoso]);

    const restablecerPassword = async (e) => {
        e.preventDefault();

        setMensaje('');
        setTipoMensaje('');

        if (!token) {
            setMensaje(
                'El enlace de recuperación no contiene un token válido.'
            );
            setTipoMensaje('error');
            return;
        }

        if (password.length < 8) {
            setMensaje(
                'La contraseña debe tener al menos 8 caracteres.'
            );
            setTipoMensaje('error');
            return;
        }

        if (password !== passwordConfirmation) {
            setMensaje('Las contraseñas no coinciden.');
            setTipoMensaje('error');
            return;
        }

        setCargando(true);

        try {
            const respuesta = await fetch(
                'http://127.0.0.1:8000/api/reset-password',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                    body: JSON.stringify({
                        email: email.trim(),
                        token,
                        password,
                        password_confirmation: passwordConfirmation,
                    }),
                }
            );

            const datos = await respuesta.json();

            if (!respuesta.ok) {
                let mensajeError =
                    datos.message ||
                    'No se pudo restablecer la contraseña.';

                if (datos.errors) {
                    mensajeError = Object.values(datos.errors)
                        .flat()
                        .join(' ');
                }

                setMensaje(mensajeError);
                setTipoMensaje('error');
                return;
            }

            setMensaje(
                datos.message ||
                    '¡Tu contraseña se ha restablecido correctamente!'
            );
            setTipoMensaje('exito');
            setRestablecimientoExitoso(true);

            setPassword('');
            setPasswordConfirmation('');
        } catch (error) {
            console.error(
                'Error al restablecer la contraseña:',
                error
            );

            setMensaje(
                'No se pudo conectar con el servidor. Inténtalo nuevamente.'
            );
            setTipoMensaje('error');
        } finally {
            setCargando(false);
        }
    };

    return (
        <main className="reset-page">
            <section className="reset-card">
                <header className="reset-header">
                    <div className="reset-brand-icon" aria-hidden="true">
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <rect
                                x="4"
                                y="10"
                                width="16"
                                height="11"
                                rx="2"
                            />
                            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                            <path d="M12 14v3" />
                        </svg>
                    </div>

                    <h1 className="reset-logo">
                        Study<span>Hub</span>
                    </h1>

                    <p className="reset-slogan">
                        Organiza, aprende y sube de nivel.
                    </p>
                </header>

                <div className="reset-intro">
                    <p className="reset-eyebrow">
                        SEGURIDAD DE TU CUENTA
                    </p>

                    <h2>Restablecer contraseña</h2>

                    <p className="reset-description">
                        Crea una nueva contraseña para recuperar el acceso
                        a tu cuenta de StudyHub.
                    </p>
                </div>

                {!restablecimientoExitoso && (
                    <form onSubmit={restablecerPassword}>
                        <div className="reset-field">

                            <input
                                id="reset-email"
                                type="email"
                                placeholder="tu@correo.com"
                                autoComplete="email"
                                value={email}
                                onChange={(e) =>
                                    setEmail(e.target.value)
                                }
                                required
                            />
                        </div>

                        <div className="reset-field">


                            <div className="reset-password-input">
                                <input
                                    id="reset-password"
                                    type={
                                        mostrarPassword
                                            ? 'text'
                                            : 'password'
                                    }
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
                                    className="reset-toggle-password"
                                    onClick={() =>
                                        setMostrarPassword(
                                            (anterior) => !anterior
                                        )
                                    }
                                    aria-label={
                                        mostrarPassword
                                            ? 'Ocultar contraseña'
                                            : 'Mostrar contraseña'
                                    }
                                >
                                    {mostrarPassword
                                        ? 'Ocultar'
                                        : 'Mostrar'}
                                </button>
                            </div>

                            <p className="reset-hint">

                            </p>
                        </div>

                        <div className="reset-field">

                            <div className="reset-password-input">
                                <input
                                    id="reset-confirm-password"
                                    type={
                                        mostrarConfirmacion
                                            ? 'text'
                                            : 'password'
                                    }
                                    placeholder="Escribe la contraseña nuevamente"
                                    autoComplete="new-password"
                                    value={passwordConfirmation}
                                    onChange={(e) =>
                                        setPasswordConfirmation(
                                            e.target.value
                                        )
                                    }
                                    minLength={8}
                                    required
                                />


                                <button
                                    type="button"
                                    className="reset-toggle-password"
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
                                    {mostrarConfirmacion
                                        ? 'Ocultar'
                                        : 'Mostrar'}
                                </button>
                            </div>
                        </div>

                        {mensaje && (
                            <div
                                className={`reset-alert ${tipoMensaje}`}
                                role={
                                    tipoMensaje === 'error'
                                        ? 'alert'
                                        : 'status'
                                }
                                aria-live="polite"
                            >
                                <span
                                    className="reset-alert-icon"
                                    aria-hidden="true"
                                >
                                    {tipoMensaje === 'error' ? '!' : '✓'}
                                </span>

                                <p>{mensaje}</p>
                            </div>
                        )}

                        <button
                            className="reset-button"
                            type="submit"
                            disabled={cargando}
                        >
                            {cargando
                                ? 'Restableciendo...'
                                : 'Cambiar contraseña'}
                        </button>
                    </form>
                )}

                {restablecimientoExitoso && (
                    <div
                        className="reset-success"
                        role="status"
                        aria-live="polite"
                    >
                        <span
                            className="reset-success-icon"
                            aria-hidden="true"
                        >
                            ✓
                        </span>

                        <h3>¡Contraseña actualizada!</h3>

                        <p>{mensaje}</p>

                        <p className="reset-redirect-message">
                            Te redirigiremos al inicio de sesión en unos
                            segundos...
                        </p>

                        <a className="reset-return-link" href="/">
                            Ir al inicio de sesión ahora
                        </a>
                    </div>
                )}

                {!restablecimientoExitoso && (
                    <footer className="reset-footer">
                        <a href="/">← Volver al inicio de sesión</a>
                    </footer>
                )}
            </section>

            <p className="reset-copyright">
                © {new Date().getFullYear()} StudyHub. Todos los derechos
                reservados.
            </p>
        </main>
    );
}

export default ResetPassword;