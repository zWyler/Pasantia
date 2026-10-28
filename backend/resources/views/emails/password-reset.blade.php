<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Recuperación de contraseña</title>
</head>
<body>
    <h1>StudyHub</h1>

    <p>Hola,</p>

    <p>
        Recibimos una solicitud para restablecer la contraseña
        de tu cuenta de StudyHub.
    </p>

    <p>
        Haz clic en el siguiente botón para crear una contraseña nueva:
    </p>

    <p>
        <a href="{{ $resetLink }}"
           style="display:inline-block;padding:12px 20px;background-color:#6c4cf1;color:white;text-decoration:none;border-radius:6px;">
            Restablecer mi contraseña
        </a>
    </p>

    <p>
        Si no solicitaste este cambio, puedes ignorar este correo.
    </p>

    <p>Equipo de StudyHub</p>
</body>
</html>