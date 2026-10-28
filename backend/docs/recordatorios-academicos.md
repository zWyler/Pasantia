# Recordatorios académicos

StudyHub genera notificaciones internas para tareas con fecha de entrega. No se envían correos ni mensajes externos.

## Tipos y fechas

- `proxima_entrega`: entrega dentro de las siguientes 24 horas y en un día UTC posterior.
- `entrega_hoy`: entrega futura dentro del día UTC actual.
- `tarea_vencida`: entrega anterior al momento actual, mientras la tarea siga sin completar.

Las tareas completadas o sin fecha se excluyen. El proyecto aún no almacena la zona horaria de cada estudiante; por eso el procesamiento usa UTC. Las ventanas se pueden ajustar en `config/academic_reminders.php`.

## Preparación y ejecución

Después de configurar la conexión de la aplicación, aplica la migración aditiva de notificaciones:

```powershell
php artisan migrate
```

Se puede ejecutar el generador manualmente para validar el procesamiento:

```powershell
php artisan studyhub:generar-recordatorios
```

En desarrollo, mantén activo el scheduler de Laravel en una terminal:

```powershell
php artisan schedule:work
```

En un servidor Unix, configura el cron de Laravel para invocar el scheduler cada minuto:

```cron
* * * * * cd /ruta/a/StudyHub/backend && php artisan schedule:run >> /dev/null 2>&1
```

En Windows, configura el Programador de tareas para ejecutar `php artisan schedule:run` cada minuto, con `backend` como directorio de trabajo. El scheduler ejecutará el generador cada cinco minutos y evita solapamientos.

Este flujo guarda las notificaciones en la base de datos dentro de la ejecución del comando. No requiere un worker de colas. Una clave idempotente única hace que una segunda ejecución no duplique recordatorios para la misma tarea, tipo y fecha de entrega.

## API autenticada

- `GET /api/notificaciones?page=1&per_page=20`: lista paginada de notificaciones activas del usuario.
- `GET /api/notificaciones/contador`: cantidad de no leídas.
- `PATCH /api/notificaciones/{id}/leer`: marca una notificación propia como leída.
- `PATCH /api/notificaciones/leer-todas`: marca las propias como leídas.
- `DELETE /api/notificaciones/{id}`: elimina una notificación propia.

Todas las rutas requieren Sanctum. Los recursos ajenos y las notificaciones invalidadas responden como no encontrados.
