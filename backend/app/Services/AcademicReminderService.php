<?php

namespace App\Services;

use App\Models\Notificacion;
use App\Models\Tarea;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AcademicReminderService
{
    /**
     * Process bounded batches. The unique idempotency key and insertOrIgnore
     * make reruns and concurrent scheduler invocations safe.
     */
    public function generarRecordatorios(): int
    {
        $zona = config('academic_reminders.timezone', 'UTC');
        $ahora = now($zona)->utc();
        $ventanaHoras = max(1, (int) config('academic_reminders.upcoming_window_hours', 24));
        $limite = max(1, (int) config('academic_reminders.batch_size', 500));
        $inicioDia = $ahora->copy()->startOfDay();
        $finDia = $inicioDia->copy()->addDay();

        $creadas = 0;
        $creadas += $this->procesarTipo(
            'proxima_entrega',
            'Entrega próxima',
            'La tarea «:titulo» vence dentro de las próximas '.$ventanaHoras.' horas.',
            fn (Builder $consulta) => $consulta
                ->where('fecha_entrega', '>=', $finDia)
                ->where('fecha_entrega', '<=', $ahora->copy()->addHours($ventanaHoras)),
            $ahora,
            $limite
        );

        $creadas += $this->procesarTipo(
            'entrega_hoy',
            'Entrega para hoy',
            'La tarea «:titulo» tiene su fecha de entrega hoy (UTC).',
            fn (Builder $consulta) => $consulta
                ->where('fecha_entrega', '>=', $ahora)
                ->where('fecha_entrega', '<', $finDia),
            $ahora,
            $limite
        );

        $creadas += $this->procesarTipo(
            'tarea_vencida',
            'Tarea vencida',
            'La tarea «:titulo» venció y aún no está completada.',
            fn (Builder $consulta) => $consulta->where('fecha_entrega', '<', $ahora),
            $ahora,
            $limite
        );

        return $creadas;
    }

    public function invalidarRecordatoriosDe(Tarea $tarea): int
    {
        return Notificacion::query()
            ->where('tarea_id', $tarea->id)
            ->whereNull('invalidada_en')
            ->update([
                'invalidada_en' => now('UTC'),
                'updated_at' => now('UTC'),
            ]);
    }

    private function procesarTipo(
        string $tipo,
        string $titulo,
        string $mensaje,
        callable $filtroTemporal,
        Carbon $ahora,
        int $limite
    ): int {
        $tareas = Tarea::query()
            ->with('materia:id,user_id,nombre')
            ->where('estado', '<>', 'completada')
            ->whereNotNull('fecha_entrega')
            ->whereHas('materia', fn (Builder $consulta) => $consulta->whereNotNull('user_id'))
            ->whereDoesntHave('notificaciones', function (Builder $consulta) use ($tipo) {
                $consulta->where('tipo', $tipo)
                    ->whereColumn('fecha_entrega_referencia', 'tareas.fecha_entrega');
            });

        $filtroTemporal($tareas);

        $filas = $tareas
            ->orderBy('fecha_entrega')
            ->limit($limite)
            ->get(['id', 'materia_id', 'titulo', 'fecha_entrega'])
            ->map(function (Tarea $tarea) use ($tipo, $titulo, $mensaje, $ahora): array {
                $vencimiento = $tarea->fecha_entrega->copy()->utc();
                $vencimientoDb = $vencimiento->format('Y-m-d H:i:s');
                $texto = str_replace(':titulo', $tarea->titulo, $mensaje);

                return [
                    'user_id' => $tarea->materia->user_id,
                    'tarea_id' => $tarea->id,
                    'tipo' => $tipo,
                    'titulo' => $titulo,
                    'mensaje' => $texto,
                    'fecha_entrega_referencia' => $vencimientoDb,
                    'idempotency_key' => hash('sha256', implode('|', [
                        $tarea->materia->user_id,
                        $tarea->id,
                        $tipo,
                        $vencimientoDb,
                    ])),
                    'leida_en' => null,
                    'invalidada_en' => null,
                    'created_at' => $ahora->format('Y-m-d H:i:s'),
                    'updated_at' => $ahora->format('Y-m-d H:i:s'),
                ];
            })
            ->all();

        if ($filas === []) {
            return 0;
        }

        return DB::table('notificaciones')->insertOrIgnore($filas);
    }
}
