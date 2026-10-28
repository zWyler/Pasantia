<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\MateriaController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TareaController;
use App\Http\Controllers\AcademicSummaryController;
use App\Http\Controllers\NotificacionController;

Route::get('/test', function () {
    return response()->json([
        'message' => 'StudyHub API funcionando correctamente',
    ]);
});

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:10,1');
Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', function (Request $request) {
        return response()->json([
            'user' => $request->user(),
        ]);
    });

    Route::put('/profile', [AuthController::class, 'actualizarPerfil']);

    Route::post('/logout', function (Request $request) {
        $token = $request->user()->currentAccessToken();

        if ($token && method_exists($token, 'delete')) {
            $token->delete();
        }

        return response()->json([
            'message' => 'Sesión cerrada correctamente.',
        ]);
    });

    Route::get('/dashboard/resumen', [AcademicSummaryController::class, 'dashboard']);
    Route::get('/estadisticas', [AcademicSummaryController::class, 'estadisticas']);

    // Notificaciones del estudiante autenticado
    Route::get('/notificaciones/contador', [NotificacionController::class, 'contador']);
    Route::patch('/notificaciones/leer-todas', [NotificacionController::class, 'marcarTodasLeidas']);
    Route::get('/notificaciones', [NotificacionController::class, 'index']);
    Route::patch('/notificaciones/{notificacion}/leer', [NotificacionController::class, 'marcarLeida']);
    Route::delete('/notificaciones/{notificacion}', [NotificacionController::class, 'destroy']);

    // Gestión de materias
    Route::get('/materias', [MateriaController::class, 'index']);
    Route::post('/materias', [MateriaController::class, 'store']);
    Route::get('/materias/{materia}', [MateriaController::class, 'show']);
    Route::put('/materias/{materia}', [MateriaController::class, 'update']);
    Route::patch('/materias/{materia}', [MateriaController::class, 'update']);
    Route::delete('/materias/{materia}', [MateriaController::class, 'destroy']);

    // Gestión de tareas
    Route::get('/materias/{materia}/tareas', [TareaController::class, 'index']);
    Route::post('/materias/{materia}/tareas', [TareaController::class, 'store']);

    Route::get('/tareas', [TareaController::class, 'buscar']);
    Route::get('/tareas/{tarea}', [TareaController::class, 'show']);
    Route::put('/tareas/{tarea}', [TareaController::class, 'update']);
    Route::patch('/tareas/{tarea}', [TareaController::class, 'update']);
    Route::delete('/tareas/{tarea}', [TareaController::class, 'destroy']);

});
