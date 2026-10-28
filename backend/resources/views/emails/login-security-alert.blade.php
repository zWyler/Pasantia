<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Alerta de seguridad - StudyHub</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f7; padding: 20px; color: #333;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 10px;">
        <h1 style="color: #6c4ce4;">StudyHub</h1>

        <h2>Alerta de seguridad</h2>

        <p>Hola,</p>

        <p>
            Hemos detectado varios intentos fallidos de inicio de sesión en tu cuenta de StudyHub.
        </p>

        <p>
            Como medida preventiva, tu cuenta ha sido bloqueada temporalmente durante
            <strong>{{ $lockMinutes }} minutos</strong>.
        </p>

        <p>
            Si reconoces estos intentos, puedes ignorar este mensaje. Si no fuiste tú,
            te recomendamos restablecer tu contraseña inmediatamente.
        </p>

        <div style="margin: 25px 0;">
        <a
            href="{{ rtrim(config('app.frontend_url', 'http://localhost:5173'), '/') }}/forgot-password"
            style="display: inline-block; background-color: #6c4ce4; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 6px;"
        >
            Restablecer contraseña
        </a>
    </div>


        <p style="font-size: 13px; color: #666;">
            Por seguridad, nunca compartas tu contraseña ni los códigos de recuperación.
        </p>

        <p>El equipo de seguridad de StudyHub</p>
    </div>
</body>
</html>
