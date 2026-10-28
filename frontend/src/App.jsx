import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { apiRequest } from './api';
import ForgotPassword from './components/ForgotPassword';
import Login from './components/Login';
import Register from './components/Register';
import ResetPassword from './components/ResetPassword';
import StudentLayout from './layouts/StudentLayout';
import HomePage from './pages/HomePage';
import MateriasPage from './pages/MateriasPage';
import TareasPage from './pages/TareasPage';
import CalendarioPage from './pages/CalendarioPage';
import EstadisticasPage from './pages/EstadisticasPage';
import NotificacionesPage from './pages/NotificacionesPage';
import ThemeToggle from './components/ThemeToggle';
import { initialTheme, persistTheme } from './utils/theme';

function App() {
    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [tema, setTema] = useState(initialTheme);
    const navigate = useNavigate();

    const alternarTema = () => {
        const siguiente = tema === 'dark' ? 'light' : 'dark';
        persistTheme(siguiente);
        setTema(siguiente);
    };

    const actualizarUsuario = (usuarioActualizado) => {
        setUsuario(usuarioActualizado);
        localStorage.setItem('user', JSON.stringify(usuarioActualizado));
    };

    useEffect(() => {
        let activo = true;
        const verificarSesion = async () => {
            if (!localStorage.getItem('token')) {
                if (activo) setCargando(false);
                return;
            }

            try {
                const datos = await apiRequest('/me');
                if (!activo) return;
                setUsuario(datos.user);
                localStorage.setItem('user', JSON.stringify(datos.user));
            } catch (error) {
                if (!activo) return;
                if (error.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setUsuario(null);
                } else {
                    console.error('Error al verificar la sesión:', error);
                }
            } finally {
                if (activo) setCargando(false);
            }
        };

        verificarSesion();
        return () => { activo = false; };
    }, []);

    const cerrarSesion = async () => {
        try {
            if (localStorage.getItem('token')) {
                await apiRequest('/logout', { method: 'POST' });
            }
        } catch (error) {
            console.error('Error al cerrar sesión en el servidor:', error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUsuario(null);
            navigate('/', { replace: true });
        }
    };

    if (cargando) {
        return (
            <div className="studyhub-app">
                <ThemeToggle theme={tema} onToggle={alternarTema} compact />
                <div className="app-loading" role="status">Verificando sesión…</div>
            </div>
        );
    }

    if (!usuario) {
        return (
            <div className="studyhub-app">
                <ThemeToggle theme={tema} onToggle={alternarTema} compact />
                <Routes>
                    <Route path="/" element={<Login alIniciarSesion={setUsuario} />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </div>
        );
    }

    return (
        <div className="studyhub-app">
        <Routes>
            <Route element={<StudentLayout usuario={usuario} cerrarSesion={cerrarSesion} tema={tema} alternarTema={alternarTema} />}>
                <Route index element={<HomePage usuario={usuario} actualizarUsuario={actualizarUsuario} />} />
                <Route path="materias" element={<MateriasPage />} />
                <Route path="tareas" element={<TareasPage />} />
                <Route path="calendario" element={<CalendarioPage />} />
                <Route path="estadisticas" element={<EstadisticasPage />} />
                <Route path="notificaciones" element={<NotificacionesPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
        </div>
    );
}

export default App;
