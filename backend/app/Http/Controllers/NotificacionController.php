<?php

namespace App\Http\Controllers;

use App\Models\Notificacion;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificacionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);
        $porPagina = (int) ($datos['per_page'] ?? 20);
        $pagina = (int) ($datos['page'] ?? 1);

        $paginador = $this->notificacionesVisibles($request)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($porPagina, ['*'], 'page', $pagina);

        return response()->json([
            'notificaciones' => $paginador->items(),
            'paginacion' => [
                'pagina' => $paginador->currentPage(),
                'por_pagina' => $paginador->perPage(),
                'total' => $paginador->total(),
                'ultima_pagina' => $paginador->lastPage(),
            ],
        ]);
    }

    public function contador(Request $request): JsonResponse
    {
        $cantidad = $this->notificacionesVisibles($request)
            ->whereNull('leida_en')
            ->count();

        return response()->json(['no_leidas' => $cantidad]);
    }

    public function marcarLeida(Request $request, int $notificacion): JsonResponse
    {
        $registro = $this->notificacionesVisibles($request)->findOrFail($notificacion);

        if ($registro->leida_en === null) {
            $registro->forceFill(['leida_en' => now('UTC')])->save();
        }

        return response()->json([
            'message' => 'Notificación marcada como leída.',
            'notificacion' => $registro,
        ]);
    }

    public function marcarTodasLeidas(Request $request): JsonResponse
    {
        $cantidad = $this->notificacionesVisibles($request)
            ->whereNull('leida_en')
            ->update(['leida_en' => now('UTC'), 'updated_at' => now('UTC')]);

        return response()->json([
            'message' => 'Notificaciones marcadas como leídas.',
            'actualizadas' => $cantidad,
        ]);
    }

    public function destroy(Request $request, int $notificacion): JsonResponse
    {
        $registro = $this->notificacionesVisibles($request)->findOrFail($notificacion);
        $registro->delete();

        return response()->json(['message' => 'Notificación eliminada.']);
    }

    private function notificacionesVisibles(Request $request): Builder
    {
        return Notificacion::query()
            ->where('user_id', $request->user()->id)
            ->whereNull('invalidada_en')
            ->with([
                'tarea' => fn (BelongsTo $consulta) => $consulta
                    ->select(['id', 'materia_id', 'titulo'])
                    ->whereHas('materia', fn (Builder $materia) => $materia->where('user_id', $request->user()->id)),
                'tarea.materia:id,nombre',
            ]);
    }
}
