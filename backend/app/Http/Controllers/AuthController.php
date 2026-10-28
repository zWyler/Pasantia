<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Hash;
use App\Rules\SecurePassword;
use App\Mail\LoginSecurityAlertMail;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $datos = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => ['required', 'string', 'max:255', new SecurePassword()],
        ]);

        $usuario = User::create([
            'name' => $datos['name'],
            'email' => $datos['email'],
            'password' => Hash::make($datos['password']),
        ]);

        return response()->json([
            'message' => 'Usuario registrado correctamente',
            'user' => $usuario,
        ], 201);
    }

    public function login(Request $request)
{
    $datos = $request->validate([
        'email' => 'required|email|max:255',
        'password' => 'required|string|max:255',
    ]);

$usuario = User::where('email', $datos['email'])->first();

if (!$usuario) {
    return response()->json([
        'message' => 'Las credenciales son incorrectas'
    ], 401);
}

// Verificar si la cuenta está temporalmente bloqueada.
if ($usuario->locked_until) {
    if (now()->lt($usuario->locked_until)) {
        return response()->json([
            'message' => 'Tu cuenta está temporalmente bloqueada por seguridad. Revisa tu correo electrónico.',
            'locked_until' => $usuario->locked_until,
        ], 423);
    }

    // El bloqueo venció: limpiar su fecha.
    $usuario->locked_until = null;
    $usuario->save();
}

$passwordGuardada = $usuario->password;

// Compatibilidad con las contraseñas antiguas almacenadas con SHA-256.
if (preg_match('/^[a-f0-9]{64}$/i', $passwordGuardada)) {
    $passwordCorrecta = hash_equals(
        $passwordGuardada,
        hash('sha256', $datos['password'])
    );

    // Si coincide, migramos la contraseña a bcrypt.
    if ($passwordCorrecta) {
        $usuario->password = Hash::make($datos['password']);
        $usuario->save();
    }

} else {
    // Verificación de contraseñas nuevas almacenadas con bcrypt.
    $passwordCorrecta = Hash::check(
        $datos['password'],
        $passwordGuardada
    );
}

if (!$passwordCorrecta) {
    $usuario->failed_login_attempts++;

    $enviarAlerta = false;
    $minutosBloqueo = 15;

    if ($usuario->failed_login_attempts >= 3) {
        $usuario->lock_level++;

        $minutosBloqueo = min(
            15 * (2 ** ($usuario->lock_level - 1)),
            240
        );

        $usuario->locked_until = now()->addMinutes($minutosBloqueo);
        $usuario->failed_login_attempts = 0;
        $enviarAlerta = true;
    }

    $usuario->save();

    if ($enviarAlerta) {
        try {
            Mail::to($usuario->email)->send(
                new LoginSecurityAlertMail($minutosBloqueo)
            );
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error(
                'No se pudo enviar la alerta de seguridad de StudyHub.',
                ['user_id' => $usuario->id]
            );
        }

        return response()->json([
            'message' => "Se detectaron varios intentos fallidos. Tu cuenta está bloqueada temporalmente durante {$minutosBloqueo} minutos. Revisa tu correo electrónico."
        ], 423);
    }

    return response()->json([
        'message' => 'Las credenciales son incorrectas'
    ], 401);
}
    // Reiniciar el contador tras un inicio de sesión exitoso.
    $usuario->failed_login_attempts = 0;
    $usuario->save();
    $token = $usuario->createToken('studyhub-token')->plainTextToken;

return response()->json([
    'message' => 'Inicio de sesión exitoso',
    'user' => $usuario,
    'token' => $token,
    ]);
}


public function forgotPassword(Request $request)
{
    $request->validate([
        'email' => 'required|email|max:255',
    ]);

    $status = Password::sendResetLink(
        $request->only('email')
    );

    if ($status === Password::RESET_LINK_SENT || $status === Password::INVALID_USER) {
        return response()->json([
            'message' => 'Si el correo está registrado, recibirás un enlace de recuperación.',
        ]);
    }

    if ($status === Password::RESET_THROTTLED) {
        return response()->json([
            'message' => 'Espera un momento antes de solicitar otro enlace.',
        ], 429);
    }

    return response()->json([
        'message' => 'No se pudo enviar el enlace de recuperación.',
    ], 422);

}

public function resetPassword(Request $request)
{
$datos = $request->validate([
'email' => 'required|email|max:255',
'token' => 'required|string|max:255',
'password' => ['required', 'string', 'max:255', 'confirmed', new SecurePassword()],
]);

$status = Password::reset(
    $datos,
    function (User $usuario, string $password) {

    $usuario->forceFill([
        'password' => Hash::make($password),
        'failed_login_attempts' => 0,
        'locked_until' => null,
        'lock_level' => 0,
    ])->save();

    // Password changes invalidate all previously issued API credentials.
    $usuario->tokens()->delete();


    }
);

if ($status === Password::PASSWORD_RESET) {
    return response()->json([
        'message' => 'Tu contraseña se ha restablecido correctamente.',
    ]);
}

return response()->json([
    'message' => 'El enlace de recuperación no es válido o ha expirado.',
], 422);
        }




        public function actualizarPerfil(Request $request)
{
$usuario = $request->user();


$datos = $request->validate([
    'name' => 'required|string|max:255',
    'email' => 'required|email|max:255|unique:users,email,' . $usuario->id,
]);

$usuario->update([
    'name' => $datos['name'],
    'email' => $datos['email'],
]);

return response()->json([
    'message' => 'Perfil actualizado correctamente.',
    'user' => $usuario->fresh(),
]);
}
}
