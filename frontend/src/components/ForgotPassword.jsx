import { useState } from 'react';
import './ForgotPassword.css';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  const solicitarRecuperacion = async (e) => {
    e.preventDefault();
    setMensaje('');
    setTipoMensaje('');
    setCargando(true);

    try {
      const respuesta = await fetch(
        'http://127.0.0.1:8000/api/forgot-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ email }),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        setTipoMensaje('error');
        setMensaje(
          datos.message || 'No se pudo procesar la solicitud.'
        );
        return;
      }

      setTipoMensaje('exito');
      setMensaje(
        datos.message ||
          'Si el correo está registrado, recibirás un enlace de recuperación.'
      );
    } catch (error) {
      console.error(error);
      setTipoMensaje('error');
      setMensaje('No se pudo conectar con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="forgot-page">
      <section className="forgot-card">
        <a href="/" className="forgot-back" aria-label="Volver al inicio de sesión">
          <span aria-hidden="true">←</span>
          Volver al inicio
        </a>

        <div className="forgot-icon" aria-hidden="true">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <path d="m4 7 8 6 8-6" />
            <path d="M15.5 3.5 17 2l2 2" />
          </svg>
        </div>

        <p className="forgot-eyebrow">RECUPERACIÓN DE CUENTA</p>

        <h1>¿Olvidaste tu contraseña?</h1>

        <p className="forgot-description">
          No te preocupes, nos pasa a todos. Introduce el correo
          electrónico asociado a tu cuenta y te enviaremos un enlace
          para crear una nueva contraseña.
        </p>

        <form onSubmit={solicitarRecuperacion} className="forgot-form">
          <div className="forgot-field">
            <label htmlFor="recovery-email">
              Correo electrónico
            </label>

            <div className="forgot-input-wrapper">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <path d="m4 7 8 6 8-6" />
              </svg>

              <input
                id="recovery-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@correo.com"
                autoComplete="email"
                required
                disabled={cargando}
              />
            </div>
          </div>

          <button
            type="submit"
            className="forgot-submit"
            disabled={cargando}
          >
            {cargando ? (
              <>
                <span className="forgot-spinner" aria-hidden="true" />
                Enviando solicitud...
              </>
            ) : (
              <>
                Enviar enlace de recuperación
                <span aria-hidden="true">→</span>
              </>
            )}
          </button>
        </form>

        {mensaje && (
          <div
            className={`forgot-alert ${tipoMensaje}`}
            role="status"
            aria-live="polite"
          >
            <span className="forgot-alert-icon" aria-hidden="true">
              {tipoMensaje === 'error' ? '!' : '✓'}
            </span>
            <p>{mensaje}</p>
          </div>
        )}

        <div className="forgot-security">
          <span aria-hidden="true">🔒</span>
          <p>Tu cuenta y tu información están protegidas.</p>
        </div>

        <div className="forgot-footer">
          ¿Ya recuerdas tu contraseña? <a href="/">Inicia sesión</a>
        </div>
      </section>

      <p className="forgot-brand">
        <span>Study</span>Hub
        <span className="forgot-brand-dot">.</span>
      </p>
    </main>
  );
}

export default ForgotPassword;