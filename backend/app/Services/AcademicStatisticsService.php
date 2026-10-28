<?php

namespace App\Services;

use App\Models\Tarea;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

class AcademicStatisticsService
{
    public function dashboard(User $usuario): array
    {
        $ahora = now()->utc();
        $consulta = $this->tareasDelUsuario($usuario);
        $conteos = $this->agregarConteos(clone $consulta, $ahora);

        $proximas = (clone $consulta)
            ->with('materia:id,nombre')
            ->where('estado', '<>', 'completada')
            ->whereNotNull('fecha_entrega')
            ->where('fecha_entrega', '>=', $ahora)
            ->orderBy('fecha_entrega')
            ->limit(5)
            ->get(['id', 'materia_id', 'titulo', 'estado', 'prioridad', 'fecha_entrega']);

        return [
            'total_materias' => $usuario->materias()->count(),
            'total_tareas' => $conteos['total'],
            'tareas_pendientes' => $conteos['pendientes'],
            'tareas_en_progreso' => $conteos['en_progreso'],
            'tareas_completadas' => $conteos['completadas'],
            'tareas_vencidas' => $conteos['vencidas'],
            'definicion_vencidas' => 'Tareas no completadas con fecha de entrega anterior al momento actual.',
            'proximas_entregas' => $proximas,
        ];
    }

    public function estadisticas(User $usuario, string $periodo): array
    {
        $ahora = now()->utc();
        [$desde, $descripcion] = $this->rangoPeriodo($periodo, $ahora);
        $consulta = $this->tareasDelUsuario($usuario);

        if ($desde) {
            $consulta->where('created_at', '>=', $desde)
                ->where('created_at', '<=', $ahora);
        }

        $conteos = $this->agregarConteos($consulta, $ahora);
        $total = $conteos['total'];

        return [
            'periodo' => $periodo,
            'criterio_periodo' => 'Las tareas se incluyen por su fecha de creación; el estado y el vencimiento reflejan su situación actual.',
            'descripcion_periodo' => $descripcion,
            'desde' => $desde?->toISOString(),
            'hasta' => $periodo === 'todo' ? null : $ahora->toISOString(),
            'total_tareas' => $total,
            'tareas_vencidas' => $conteos['vencidas'],
            'porcentaje_completadas' => $this->porcentaje($conteos['completadas'], $total),
            'porcentaje_pendientes' => $this->porcentaje($conteos['pendientes'], $total),
            'porcentaje_en_progreso' => $this->porcentaje($conteos['en_progreso'], $total),
            'tasa_finalizacion' => $this->porcentaje($conteos['completadas'], $total),
            'estados' => [
                ['clave' => 'pendiente', 'etiqueta' => 'Pendientes', 'cantidad' => $conteos['pendientes'], 'porcentaje' => $this->porcentaje($conteos['pendientes'], $total)],
                ['clave' => 'en_progreso', 'etiqueta' => 'En progreso', 'cantidad' => $conteos['en_progreso'], 'porcentaje' => $this->porcentaje($conteos['en_progreso'], $total)],
                ['clave' => 'completada', 'etiqueta' => 'Completadas', 'cantidad' => $conteos['completadas'], 'porcentaje' => $this->porcentaje($conteos['completadas'], $total)],
            ],
            'prioridades' => [
                ['clave' => 'baja', 'etiqueta' => 'Baja', 'cantidad' => $conteos['prioridad_baja'], 'porcentaje' => $this->porcentaje($conteos['prioridad_baja'], $total)],
                ['clave' => 'media', 'etiqueta' => 'Media', 'cantidad' => $conteos['prioridad_media'], 'porcentaje' => $this->porcentaje($conteos['prioridad_media'], $total)],
                ['clave' => 'alta', 'etiqueta' => 'Alta', 'cantidad' => $conteos['prioridad_alta'], 'porcentaje' => $this->porcentaje($conteos['prioridad_alta'], $total)],
            ],
            'evolucion' => [
                'disponible' => false,
                'motivo' => 'El modelo conserva el estado actual y las fechas de creación y actualización, pero no registra cuándo se completó cada tarea ni su historial de estados.',
            ],
        ];
    }

    private function tareasDelUsuario(User $usuario): Builder
    {
        return Tarea::query()->whereHas(
            'materia',
            fn (Builder $consulta) => $consulta->where('user_id', $usuario->id)
        );
    }

    /** @return array<string, int> */
    private function agregarConteos(Builder $consulta, Carbon $ahora): array
    {
        $conteos = (clone $consulta)
            ->selectRaw('COUNT(*) AS total')
            ->selectRaw("SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) AS pendientes")
            ->selectRaw("SUM(CASE WHEN estado = 'en_progreso' THEN 1 ELSE 0 END) AS en_progreso")
            ->selectRaw("SUM(CASE WHEN estado = 'completada' THEN 1 ELSE 0 END) AS completadas")
            ->selectRaw(
                "SUM(CASE WHEN estado <> 'completada' AND fecha_entrega IS NOT NULL AND fecha_entrega < ? THEN 1 ELSE 0 END) AS vencidas",
                [$ahora->format('Y-m-d H:i:s')]
            )
            ->selectRaw("SUM(CASE WHEN prioridad = 'baja' THEN 1 ELSE 0 END) AS prioridad_baja")
            ->selectRaw("SUM(CASE WHEN prioridad = 'media' THEN 1 ELSE 0 END) AS prioridad_media")
            ->selectRaw("SUM(CASE WHEN prioridad = 'alta' THEN 1 ELSE 0 END) AS prioridad_alta")
            ->first();

        return [
            'total' => (int) ($conteos->total ?? 0),
            'pendientes' => (int) ($conteos->pendientes ?? 0),
            'en_progreso' => (int) ($conteos->en_progreso ?? 0),
            'completadas' => (int) ($conteos->completadas ?? 0),
            'vencidas' => (int) ($conteos->vencidas ?? 0),
            'prioridad_baja' => (int) ($conteos->prioridad_baja ?? 0),
            'prioridad_media' => (int) ($conteos->prioridad_media ?? 0),
            'prioridad_alta' => (int) ($conteos->prioridad_alta ?? 0),
        ];
    }

    /** @return array{0: ?Carbon, 1: string} */
    private function rangoPeriodo(string $periodo, Carbon $ahora): array
    {
        return match ($periodo) {
            'ultimos_7_dias' => [$ahora->copy()->subDays(7), 'Tareas creadas en las últimas 168 horas.'],
            'ultimos_30_dias' => [$ahora->copy()->subDays(30), 'Tareas creadas en los últimos 30 días.'],
            'mes_actual' => [$ahora->copy()->startOfMonth(), 'Tareas creadas desde el inicio del mes actual.'],
            default => [null, 'Todas las tareas disponibles del usuario.'],
        };
    }

    private function porcentaje(int $cantidad, int $total): float
    {
        return $total === 0 ? 0.0 : round(($cantidad / $total) * 100, 1);
    }
}
