export const ESTADOS_TAREA = [
    ['pendiente', 'Pendiente'],
    ['en_progreso', 'En progreso'],
    ['completada', 'Completada'],
];

export const PRIORIDADES_TAREA = [
    ['baja', 'Baja'],
    ['media', 'Media'],
    ['alta', 'Alta'],
];

export function fechaParaFormulario(valor) {
    if (!valor) return '';

    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return '';

    return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60_000)
        .toISOString()
        .slice(0, 16);
}

export function fechaParaApi(valor) {
    return valor ? new Date(valor).toISOString() : null;
}

export function fechaVisible(valor) {
    if (!valor) return 'Sin fecha de entrega';

    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return 'Fecha no disponible';

    return new Intl.DateTimeFormat('es', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(fecha);
}

export function ordenarTareas(lista) {
    return [...lista].sort((a, b) => {
        if (!a.fecha_entrega && !b.fecha_entrega) return 0;
        if (!a.fecha_entrega) return 1;
        if (!b.fecha_entrega) return -1;
        return new Date(a.fecha_entrega) - new Date(b.fecha_entrega);
    });
}

export function fechaLocalClave(valor) {
    if (!valor) return null;

    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return null;

    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
}

export function diasDelCalendario(mesActivo) {
    const primerDia = new Date(mesActivo.getFullYear(), mesActivo.getMonth(), 1);
    const desplazamiento = (primerDia.getDay() + 6) % 7;

    return Array.from({ length: 42 }, (_, indice) => {
        const fecha = new Date(
            mesActivo.getFullYear(),
            mesActivo.getMonth(),
            indice - desplazamiento + 1,
        );

        return {
            fecha,
            clave: fechaLocalClave(fecha),
            perteneceAlMes: fecha.getMonth() === mesActivo.getMonth(),
        };
    });
}

export function desplazarMes(mesActivo, cantidad) {
    return new Date(mesActivo.getFullYear(), mesActivo.getMonth() + cantidad, 1);
}

export function tituloMes(mesActivo) {
    return new Intl.DateTimeFormat('es', {
        month: 'long',
        year: 'numeric',
    }).format(mesActivo);
}

export function agruparTareasPorDia(tareas) {
    const grupos = new Map();
    tareas.forEach((tarea) => {
        const clave = fechaLocalClave(tarea.fecha_entrega);
        if (!clave) return;
        grupos.set(clave, [...(grupos.get(clave) || []), tarea]);
    });
    return grupos;
}

export function tareasSinFecha(tareas) {
    return tareas.filter((tarea) => !fechaLocalClave(tarea.fecha_entrega));
}

export function textoError(error) {
    if (error?.name === 'AbortError') return '';
    if (error?.status === 401) return 'La sesión expiró. Inicia sesión nuevamente.';
    if (error?.status === 403) return 'No tienes permiso para realizar esta acción.';
    if (error?.status === 404) return 'El recurso solicitado ya no está disponible.';
    if (error?.status === 429) return 'Se hicieron demasiadas solicitudes. Espera un momento e inténtalo de nuevo.';
    if (error?.status >= 500) return 'Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.';
    if (!error?.status) return 'No se pudo conectar con StudyHub. Comprueba tu conexión e inténtalo de nuevo.';
    return error?.message || 'No se pudo completar la solicitud.';
}
