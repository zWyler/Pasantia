import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function InicioPrivado() {
    const { usuario, cerrarSesion } = useAuth();
    const navigate = useNavigate();

    const manejarCierreSesion = async () => {
        await cerrarSesion();
        navigate('/', { replace: true });
    };

    return (
        <main style={estilos.contenedor}>
            <section style={estilos.tarjeta}>
                <h1>
                    Bienvenido a <span style={estilos.acento}>StudyHub</span>
                </h1>

                <p>Has iniciado sesión correctamente.</p>

                <div style={estilos.usuario}>
                    <p>
                        <strong>Nombre:</strong> {usuario?.name}
                    </p>

                    <p>
                        <strong>Correo:</strong> {usuario?.email}
                    </p>
                </div>

                <button
                    onClick={manejarCierreSesion}
                    style={estilos.boton}
                >
                    Cerrar sesión
                </button>
            </section>
        </main>
    );
}

const estilos = {
    contenedor: {
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f8f7fc',
        fontFamily: 'Arial, sans-serif',
        padding: '20px',
    },
    tarjeta: {
        width: '100%',
        maxWidth: '450px',
        padding: '35px',
        background: '#fff',
        border: '1px solid #ebe8f3',
        borderRadius: '16px',
        boxShadow: '0 12px 40px rgba(42, 30, 80, 0.06)',
    },
    acento: {
        color: '#7654e8',
    },
    usuario: {
        margin: '25px 0',
        padding: '15px',
        background: '#f8f7fc',
        borderRadius: '10px',
        overflowWrap: 'anywhere',
    },
    boton: {
        width: '100%',
        padding: '13px',
        background: '#7654e8',
        color: '#fff',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 'bold',
    },
};

export default InicioPrivado;