import { useState, useEffect } from 'react';

import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import Dashboard from './components/Dashboard';

const API_URL = 'http://127.0.0.1:8000/api';

function App() {
const [usuario, setUsuario] = useState(null);
const [cargando, setCargando] = useState(true);
const actualizarUsuario = (usuarioActualizado) => {
    setUsuario(usuarioActualizado);
    localStorage.setItem('user', JSON.stringify(usuarioActualizado));
};
const ruta = window.location.pathname;

useEffect(() => {
    const verificarSesion = async () => {
        const token = localStorage.getItem('token');

        if (!token) {
            setCargando(false);
            return;
        }

        try {
            const respuesta = await fetch(`${API_URL}/me`, {
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!respuesta.ok) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setUsuario(null);
                return;
            }

            const datos = await respuesta.json();

            setUsuario(datos.user);
            localStorage.setItem('user', JSON.stringify(datos.user));
        } catch (error) {
            console.error('Error al verificar la sesión:', error);
        } finally {
            setCargando(false);
        }
    };

    verificarSesion();
}, []);

const cerrarSesion = async () => {
    const token = localStorage.getItem('token');

    try {
        if (token) {
            await fetch(`${API_URL}/logout`, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            });
        }
    } catch (error) {
        console.error('Error al cerrar sesión en el servidor:', error);
    } finally {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUsuario(null);
        window.location.replace('/');
    }
};

if (
    ruta === '/register' ||
    ruta === '/forgot-password' ||
    ruta === '/reset-password'
) {
    if (cargando) {
        return <p>Verificando sesión...</p>;
    }

    if (usuario) {
        return (
            <Dashboard
                usuario={usuario}
                cerrarSesion={cerrarSesion}
                actualizarUsuario={actualizarUsuario}
            />
        );
    }

    if (ruta === '/register') return <Register />;
    if (ruta === '/forgot-password') return <ForgotPassword />;
    if (ruta === '/reset-password') return <ResetPassword />;
}

if (cargando) {
    return <p>Verificando sesión...</p>;
}

if (usuario) {
    return (
        <Dashboard
            usuario={usuario}
            cerrarSesion={cerrarSesion}
            actualizarUsuario={actualizarUsuario}
        />
    );
}

return (
    <Login
        alIniciarSesion={(usuarioAutenticado) => {
            setUsuario(usuarioAutenticado);
        }}
    />
);

}

export default App;
