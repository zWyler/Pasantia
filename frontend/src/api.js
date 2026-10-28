export const API_URL = (import.meta.env?.VITE_API_URL || 'http://127.0.0.1:8000/api')
    .replace(/\/$/, '');

export class ApiError extends Error {
    constructor(message, status, errors = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.errors = errors;
    }
}

export async function apiRequest(path, { method = 'GET', body, signal } = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        Accept: 'application/json',
    };

    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    let response;
    try {
        response = await fetch(`${API_URL}${path}`, {
            method,
            headers,
            ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
            ...(signal ? { signal } : {}),
        });
    } catch (error) {
        if (error?.name === 'AbortError') throw error;
        throw new ApiError('No se pudo conectar con StudyHub. Comprueba tu conexión e inténtalo de nuevo.', 0);
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        const validationMessage = Object.values(data.errors || {})
            .flat()
            .join(' ');
        const message = response.status >= 500
            ? 'Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.'
            : validationMessage || data.message || 'No se pudo completar la solicitud.';

        throw new ApiError(
            message,
            response.status,
            data.errors || {},
        );
    }

    return data;
}
