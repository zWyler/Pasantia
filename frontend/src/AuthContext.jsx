import {
    useEffect,
    useState,
} from 'react';

import { AuthContext } from './AuthContext.js';

const API_URL = 'http://127.0.0.1:8000/api';

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(null);
    const [cargandoSesion, setCargandoSesion] = useState(true);

    useEffect(() => {
        const verificarSesion = async () => {
            const token = localStorage.getItem('token');

            if (!token) {
                setCargandoSesion(false);
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
                localStorage.setItem(
                    'user',
                    JSON.stringify(datos.user)
                );
            } catch (error) {
                console.error(
                    'No se pudo verificar la sesión:',
                    error
                );
            } finally {
                setCargandoSesion(false);
            }
        };

        verificarSesion();
    }, []);

    const iniciarSesion = (token, usuarioAutenticado) => {
        localStorage.setItem('token', token);
        localStorage.setItem(
            'user',
            JSON.stringify(usuarioAutenticado)
        );

        setUsuario(usuarioAutenticado);
    };

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
            console.error(
                'No se pudo contactar con el servidor:',
                error
            );
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUsuario(null);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                usuario,
                cargandoSesion,
                iniciarSesion,
                cerrarSesion,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}