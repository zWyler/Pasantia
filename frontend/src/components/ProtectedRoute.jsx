import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }) {
    const { usuario, cargandoSesion } = useAuth();

    if (cargandoSesion) {
        return (
            <div className="session-loading">
                Verificando sesión...
            </div>
        );
    }

    if (!usuario) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default ProtectedRoute;