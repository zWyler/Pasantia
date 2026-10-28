import { useState } from 'react';
import './Login.css';

function Login({ alIniciarSesion }) {
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [mostrarPassword, setMostrarPassword] = useState(false);
const [mensaje, setMensaje] = useState('');
const [tipoMensaje, setTipoMensaje] = useState('');
const [cargando, setCargando] = useState(false);


const iniciarSesion = async (e) => {
    e.preventDefault();

    setMensaje('');
    setTipoMensaje('');
    setCargando(true);

    try {
        const respuesta = await fetch(
            'http://127.0.0.1:8000/api/login',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ email, password }),
            }
        );

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            setMensaje(datos.message || 'No se pudo iniciar sesión.');
            setTipoMensaje('error');
            return;
        }

       localStorage.setItem('token', datos.token);

if (datos.user) {
    localStorage.setItem('user', JSON.stringify(datos.user));
    alIniciarSesion(datos.user);
};
    } catch (error) {
        console.error(error);
        setMensaje('No se pudo conectar con el servidor.');
        setTipoMensaje('error');
    } finally {
        setCargando(false);
    }
};

return (
    <main className="login-page">
        <section className="login-card">
            <header className="login-header">
                <h1 className="login-logo">
                    Study<span>Hub</span>
                </h1>

                <p className="login-slogan">
                    Organiza, aprende y sube de nivel.
                </p>
            </header>

            <div className="login-intro">
                <h2>Bienvenido de nuevo</h2>
                <p>
                    Inicia sesión para continuar organizando tus estudios
                    y alcanzar tus metas académicas.
                </p>
            </div>

            <form onSubmit={iniciarSesion}>
                <div className="login-field">
                    <label htmlFor="login-email">
                        Correo electrónico
                    </label>

                    <input
                        id="login-email"
                        type="email"
                        placeholder="tu@correo.com"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="login-field">
                    <div className="password-label">
                        <label htmlFor="login-password">
                            Contraseña
                        </label>

                    </div>

                    <div className="password-input">
                        <input
                            id="login-password"
                            type={mostrarPassword ? 'text' : 'password'}
                            placeholder="Introduce tu contraseña"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                    <div className="password-label">

                        <a href="/forgot-password">
                            ¿Olvidaste tu contraseña?
                        </a>
                    </div>

                        <button
                            type="button"
                            className="toggle-password"
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

                {mensaje && (
                    <p
                        className={`login-message ${tipoMensaje}`}
                        role="status"
                        aria-live="polite"
                    >
                        {mensaje}
                    </p>
                )}

                <button
                    className="login-button"
                    type="submit"
                    disabled={cargando}
                >
                    {cargando ? 'Iniciando sesión...' : 'Iniciar sesión'}
                </button>
            </form>

            <footer className="login-footer">
                <p>
                    ¿Todavía no tienes una cuenta?{' '}
                    <a href="/register">Crear cuenta</a>
                </p>
            </footer>
        </section>

        <p className="login-copyright">
            © {new Date().getFullYear()} StudyHub. Todos los derechos
            reservados.
        </p>
    </main>
);


}

export default Login;