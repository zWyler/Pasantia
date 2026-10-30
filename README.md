# StudyHub

StudyHub es una aplicación web para que estudiantes organicen materias y tareas académicas. Reúne autenticación, seguimiento de entregas y prioridades, búsqueda, calendario, resumen de actividad, estadísticas y notificaciones internas.

> La configuración y el correo dependen del entorno local. La presencia de código y pruebas no implica que SMTP o el programador de tareas estén activos en cada instalación.

## Objetivos y funcionalidades

- Crear una cuenta, iniciar y cerrar sesión, editar el perfil y solicitar el restablecimiento de contraseña.
- Gestionar materias y las tareas asociadas, incluyendo estado, fecha de entrega y prioridad.
- Buscar tareas por texto y combinar filtros de materia, estado, prioridad y rango de fechas; ordenar resultados.
- Consultar el calendario académico a partir de las tareas existentes.
- Consultar un resumen académico y estadísticas por periodo.
- Consultar y marcar notificaciones internas relacionadas con las entregas.
- Elegir tema claro u oscuro en la interfaz.

Las tareas se guardan con fecha en UTC y la aplicación no almacena una zona horaria por estudiante. La presentación usa la zona horaria local del navegador. Las notificaciones son internas: el generador de recordatorios no envía correos ni mensajes externos.

## Tecnologías

- **Backend:** PHP `^8.2`, Laravel `^12.0`, Laravel Sanctum `^4.0` y Eloquent.
- **Base de datos:** configuración Laravel compatible con MySQL/MariaDB; el archivo de ejemplo incluido viene preparado para SQLite.
- **Frontend:** React `^19.2`, React Router `^7.18`, JavaScript y Vite `^8.3`.
- **Pruebas frontend:** Node.js, Vitest y Testing Library.

Versiones observadas en el entorno de desarrollo durante la documentación: PHP 8.2.12, Laravel 12.69.3, Node.js 24.21.0 y npm 11.19.0. Las versiones instaladas pueden variar dentro de los rangos declarados por los manifiestos.

## Requisitos previos

- PHP 8.2 o posterior, Composer y las extensiones PHP requeridas por Laravel. Para MySQL/MariaDB se necesita el controlador PDO correspondiente (`pdo_mysql`).
- Node.js compatible con Vite 8 y Vitest 5: Node 22.12 o posterior dentro de la rama 22, Node 24, o Node 26 o posterior. npm debe estar disponible.
- MySQL o MariaDB y una base de datos vacía para una instalación nueva. Los manifiestos no fijan una versión mínima del servidor de base de datos.
- Git es útil para obtener el proyecto, aunque no es necesario para ejecutar una copia ya descargada.

## Estructura principal

C:\StudyHub\
├── backend/
│   ├── app/Http/Controllers/   # API, autenticación, materias, tareas y resumen
│   ├── app/Models/             # Usuario, materia, tarea y notificación
│   ├── app/Services/           # Estadísticas y generación de recordatorios
│   ├── app/Console/Commands/   # Comando de recordatorios académicos
│   ├── config/                 # Configuración Laravel y recordatorios
│   ├── database/migrations/   # Esquema de usuarios y funciones académicas
│   ├── routes/                 # Rutas API y programación del scheduler
│   └── tests/Feature/           # Pruebas de seguridad y flujos del backend
└── frontend/
    ├── src/pages/               # Inicio, materias, tareas, calendario y más
    ├── src/layouts/             # Navegación modular
    ├── src/components/          # Autenticación, presentación y controles
    ├── src/styles/              # Estilos de los módulos
    ├── src/utils/               # Fechas, estados y tema
    └── tests/                   # Pruebas de interfaz, calendario y calidad

## Instalación y configuración del backend

Abra PowerShell en la raíz del proyecto y prepare las dependencias y el archivo local de entorno:

cd C:\StudyHub\backend
composer install
Copy-Item .env.example .env
php artisan key:generate

`Copy-Item` es para una instalación nueva sin `.env`; si ya existe un archivo local, consérvelo y no lo sobrescriba. `APP_KEY` se genera localmente con Artisan. No comparta ni suba `.env`.

### Base de datos y migraciones

El `.env.example` actual declara `DB_CONNECTION=sqlite`. La configuración local observada para este proyecto utiliza MySQL. Para usar MySQL/MariaDB, cree previamente una base de datos vacía y configure en `backend/.env` los nombres de variables siguientes con los valores de su instalación:

DB_CONNECTION=mysql
DB_HOST=
DB_PORT=
DB_DATABASE=
DB_USERNAME=
DB_PASSWORD=

No copie credenciales de otra máquina ni las incluya en Git. Tras configurar la conexión, aplique las migraciones:

php artisan migrate

El comando crea las tablas definidas por las migraciones. Para revisar el estado sin ejecutar migraciones:

php artisan migrate:status

El servidor local de Laravel se inicia desde `backend/`:

php artisan serve --host=127.0.0.1 --port=8000

La API usa Sanctum con tokens Bearer para las rutas autenticadas.

## Instalación e inicio del frontend

En otra terminal:

cd C:\StudyHub\frontend
npm ci
npm run dev

Vite sirve la aplicación en `http://localhost:5173` por defecto. El cliente API usa como valor predeterminado `http://127.0.0.1:8000/api`.

Si el backend está en otra dirección, defina `VITE_API_URL` en `frontend/.env.local`, incluyendo el prefijo `/api`, por ejemplo:

VITE_API_URL=http://127.0.0.1:8000/api

La variable `VITE_API_URL` se lee desde el frontend y no figura en una plantilla frontend versionada. Vite incorpora variables `VITE_*` al bundle: nunca coloque secretos en ellas.

## Direcciones locales

- Aplicación web: `http://localhost:5173`
- Backend Laravel: `http://127.0.0.1:8000`
- Endpoint informativo de API: `http://127.0.0.1:8000/api/test`
- API base que utiliza el frontend: `http://127.0.0.1:8000/api`

## Funcionalidades y rutas API

Las rutas se encuentran en `backend/routes/api.php`. El listado local puede consultarse con:

cd C:\StudyHub\backend
php artisan route:list --path=api

| Acceso | Rutas | Uso |
|---|---|---|
| Público | `POST /api/register`, `POST /api/login` | Registro e inicio de sesión. |
| Público | `POST /api/forgot-password`, `POST /api/reset-password` | Solicitud y restablecimiento de contraseña. |
| Público | `GET /api/test` | Respuesta informativa de la API. |
| Sanctum | `POST /api/logout`, `GET /api/me`, `PUT /api/profile` | Sesión y perfil del usuario autenticado. |
| Sanctum | `/api/materias` y `/api/materias/{materia}` | Listado y CRUD de materias propias. |
| Sanctum | `/api/materias/{materia}/tareas` | Listado y creación de tareas de una materia propia. |
| Sanctum | `GET /api/tareas`, `/api/tareas/{tarea}` | Búsqueda y consulta de tareas propias. `PUT`, `PATCH` y `DELETE /api/tareas/{tarea}` modifican o eliminan tareas propias. |
| Sanctum | `GET /api/dashboard/resumen`, `GET /api/estadisticas` | Resumen y estadísticas académicas. |
| Sanctum | `/api/notificaciones`, `/api/notificaciones/contador`, `/api/notificaciones/leer-todas` | Consulta y gestión de notificaciones propias. |

La búsqueda acepta los criterios definidos por el controlador de tareas: texto, materia, estado, prioridad, rango de fechas y ordenamiento permitido. El calendario obtiene las tareas mediante la API y las organiza en la interfaz; no hay una ruta API independiente de calendario.

## Correo y recuperación de contraseñas

El flujo de recuperación usa las rutas de Laravel Password Broker y la página frontend `/reset-password`. El enlace se construye con `FRONTEND_URL`; la configuración Laravel tiene como valor predeterminado `http://localhost:5173`, aunque esa variable no aparece en `backend/.env.example`.

La plantilla `.env.example` usa `MAIL_MAILER=log`, que no entrega mensajes a un buzón. Para enviar correos reales, configure un proveedor SMTP y los nombres de variables que Laravel ya consume:

- `MAIL_MAILER`
- `MAIL_HOST`
- `MAIL_PORT`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`
- `MAIL_SCHEME`
- `MAIL_FROM_ADDRESS`
- `MAIL_FROM_NAME`
- `FRONTEND_URL` para construir enlaces hacia el frontend

Use los valores de su proveedor solo en el `.env` local o en el gestor de secretos del entorno. La configuración disponible no demuestra por sí sola que un servidor SMTP esté accesible ni que el correo se entregue. Después de cambiar variables, si la aplicación usa caché de configuración, puede limpiarse con:

php artisan config:clear

## Recordatorios académicos

El comando `studyhub:generar-recordatorios` crea notificaciones internas para próximas entregas y tareas vencidas. Excluye tareas completadas o sin fecha. El procesamiento usa UTC y no hay una zona horaria guardada por estudiante. Los intervalos y la zona están en `backend/config/academic_reminders.php`; la programación actual es cada cinco minutos.

Para ejecutar el generador manualmente:

cd C:\StudyHub\backend
php artisan studyhub:generar-recordatorios

En desarrollo, mantenga el scheduler activo en una terminal:

php artisan schedule:work

`php artisan schedule:list` permite comprobar la programación registrada, no que un proceso programador esté activo.

En un servidor Linux/Unix, Laravel necesita que cron invoque `schedule:run` cada minuto:

* * * * * cd /ruta/a/StudyHub/backend && php artisan schedule:run >> /dev/null 2>&1

En Windows, configure el Programador de tareas para ejecutar `php artisan schedule:run` cada minuto con `backend` como directorio de trabajo. La ejecución del scheduler en un servidor no se considera configurada hasta que ese proceso externo esté instalado y verificado.

Más detalles de las ventanas de recordatorio y de la API de notificaciones están en [`backend/docs/recordatorios-academicos.md`](backend/docs/recordatorios-academicos.md).

## Pruebas y calidad

Backend, desde `backend/`:

php artisan test

Frontend, desde `frontend/`:

npm test
npm run lint

Las pruebas de backend usan SQLite en memoria, correo simulado y cola síncrona según `backend/phpunit.xml`; no usan la base local configurada para desarrollo ni prueban la entrega de SMTP.

## Compilación de producción

Desde `frontend/`:

npm run build

Vite genera los archivos estáticos en `frontend/dist/`. `npm run preview` permite previsualizar localmente esa compilación. Configure `VITE_API_URL` para el origen real de la API antes de compilar el bundle destinado a un entorno. La compilación por sí sola no despliega la aplicación.

## Seguridad y precauciones de producción

- Las rutas privadas se agrupan bajo `auth:sanctum`; las operaciones académicas deben limitarse a recursos del usuario autenticado. Las rutas de registro, inicio y recuperación tienen límite de solicitudes.
- No versionar `.env`, contraseñas, claves ni tokens. `APP_KEY` debe generarse por entorno; no se debe reutilizar una clave de desarrollo.
- En producción establezca `APP_ENV=production`, `APP_DEBUG=false`, HTTPS, una base de datos con acceso restringido y una configuración de correo válida.
- La configuración CORS observada permite cualquier origen. Antes de exponer el backend, restrinja los orígenes permitidos a los dominios reales de la aplicación.
- El frontend guarda el token Bearer en `localStorage`; evite inyectar HTML no confiable y proteja la aplicación frente a XSS. No incluya credenciales privadas en variables `VITE_*`.
- Los recordatorios dependen de un scheduler externo activo y almacenan notificaciones internas; no envían correo.
- Las fechas de entrega se procesan en UTC, sin preferencia de zona horaria por usuario. Revise esta limitación si el uso requiere horarios locales consistentes.
- La plantilla de backend usa SQLite y correo `log`, mientras la configuración local observada usa MySQL y SMTP. Confirme y ajuste la configuración de cada instalación antes de operar.

## Solución de problemas frecuentes

| Síntoma | Comprobación |
|---|---|
| El frontend no conecta con la API | Confirme que Laravel escucha en el puerto 8000 y que `VITE_API_URL` apunta al host y prefijo `/api` correctos. Reinicie Vite si cambió `.env.local`. |
| Error de conexión a base de datos | Revise `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME` y `DB_PASSWORD`; confirme que la base existe y que PHP tiene `pdo_mysql` si usa MySQL/MariaDB. |
| Error de clave de aplicación | En `backend/`, ejecute `php artisan key:generate` solo para preparar una instalación local nueva. No reemplace la clave de un entorno existente sin un plan. |
| Las tablas no existen | Tras verificar la conexión y la base destino, revise `php artisan migrate:status`; en una instalación nueva aplique `php artisan migrate`. No ejecute migraciones contra una base de datos equivocada. |
| No llega el correo de recuperación | El modo `log` no envía correo. Configure el transporte y remitente SMTP, compruebe los logs del backend y valide la entrega con el proveedor. |
| No aparecen recordatorios nuevos | Compruebe fecha y estado de las tareas, ejecute el comando manualmente y verifique que `schedule:work` o cron/Programador de tareas esté activo. El comando no envía mensajes externos. |
| El navegador bloquea la API por CORS | Alinee el host frontend con los orígenes CORS permitidos del backend; evite abrir los permisos globalmente en producción. |
| Error de dependencias en frontend | Verifique la versión de Node requerida por Vite/Vitest y vuelva a instalar desde `frontend/package-lock.json` con `npm ci`. |