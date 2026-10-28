<?php

namespace App\Http\Controllers;

use App\Models\Materia;
use App\Models\Tarea;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use App\Services\AcademicReminderService;

class TareaController extends Controller
{
    public function buscar(Request $request): JsonResponse
    {
        $filtros = $request->validate([
            'q' => ['nullable', 'string', 'max:150'],
            'materia_id' => ['nullable', 'integer', 'min:1'],
            'estado' => [
                'nullable',
                Rule::in(['pendiente', 'en_progreso', 'completada']),
            ],
            'prioridad' => [
                'nullable',
                Rule::in(['baja', 'media', 'alta']),
            ],
            'fecha_desde' => ['nullable', 'date_format:Y-m-d'],
            'fecha_hasta' => [
                'nullable',
                'date_format:Y-m-d',
                Rule::when(
                    $request->filled('fecha_desde'),
                    ['after_or_equal:fecha_desde']
                ),
            ],
            'zona_horaria' => ['nullable', 'timezone'],
            'ordenar_por' => [
                'nullable',
                Rule::in(['fecha_entrega', 'prioridad', 'titulo']),
            ],
            'direccion' => ['nullable', Rule::in(['asc', 'desc'])],
        ]);

        $usuario = $request->user();

        if (
            isset($filtros['materia_id'])
            && !$usuario->materias()->whereKey($filtros['materia_id'])->exists()
        ) {
            abort(403, 'No tienes permiso para consultar las tareas de esta materia.');
        }

        $consulta = Tarea::query()
            ->with('materia:id,nombre')
            ->whereHas('materia', fn ($query) => $query->where('user_id', $usuario->id));

        if (!empty($filtros['materia_id'])) {
            $consulta->where('materia_id', $filtros['materia_id']);
        }

        if (!empty($filtros['q'])) {
            $texto = trim($filtros['q']);
            $consulta->where(function ($query) use ($texto) {
                $query->where('titulo', 'like', "%{$texto}%")
                    ->orWhere('descripcion', 'like', "%{$texto}%");
            });
        }

        foreach (['estado', 'prioridad'] as $campo) {
            if (!empty($filtros[$campo])) {
                $consulta->where($campo, $filtros[$campo]);
            }
        }

        $zonaHoraria = $filtros['zona_horaria'] ?? config('app.timezone', 'UTC');

        if (!empty($filtros['fecha_desde'])) {
            $desde = Carbon::parse($filtros['fecha_desde'], $zonaHoraria)
                ->startOfDay()
                ->utc();
            $consulta->where('fecha_entrega', '>=', $desde);
        }

        if (!empty($filtros['fecha_hasta'])) {
            $hastaExclusivo = Carbon::parse($filtros['fecha_hasta'], $zonaHoraria)
                ->addDay()
                ->startOfDay()
                ->utc();
            $consulta->where('fecha_entrega', '<', $hastaExclusivo);
        }

        $orden = $filtros['ordenar_por'] ?? 'fecha_entrega';
        $direccion = $filtros['direccion'] ?? 'asc';

        if ($orden === 'prioridad') {
            $consulta->orderByRaw(
                "CASE prioridad WHEN 'baja' THEN 1 WHEN 'media' THEN 2 WHEN 'alta' THEN 3 ELSE 4 END {$direccion}"
            );
        } elseif ($orden === 'fecha_entrega') {
            $consulta->orderByRaw('CASE WHEN fecha_entrega IS NULL THEN 1 ELSE 0 END')
                ->orderBy('fecha_entrega', $direccion);
        } else {
            $consulta->orderBy('titulo', $direccion);
        }

        $tareas = $consulta->orderBy('id')->get();

        return response()->json(['tareas' => $tareas]);
    }

    public function index(Request $request, Materia $materia): JsonResponse
    {
        $this->autorizarMateria($request, $materia);

        $tareas = $materia->tareas()
            ->orderByRaw("CASE WHEN fecha_entrega IS NULL THEN 1 ELSE 0 END")
            ->orderBy('fecha_entrega')
            ->get();

        return response()->json([
            'tareas' => $tareas,
        ]);
    }

    public function store(Request $request, Materia $materia): JsonResponse
    {
        $this->autorizarMateria($request, $materia);

        $datos = $request->validate([
            'titulo' => ['required', 'string', 'max:150'],
            'descripcion' => ['nullable', 'string', 'max:5000'],
            'estado' => [
                'sometimes',
                Rule::in(['pendiente', 'en_progreso', 'completada']),
            ],
            'fecha_entrega' => ['nullable', 'date'],
            'prioridad' => [
                'sometimes',
                Rule::in(['baja', 'media', 'alta']),
            ],
        ]);

        $datos = $this->normalizarFechaEntrega($datos);

        $tarea = $materia->tareas()->create($datos);

        return response()->json([
            'message' => 'Tarea creada correctamente.',
            'tarea' => $tarea,
        ], 201);
    }

    public function show(Request $request, Tarea $tarea): JsonResponse
    {
        $this->autorizarTarea($request, $tarea);

        return response()->json([
            'tarea' => $tarea,
        ]);
    }

    public function update(Request $request, Tarea $tarea): JsonResponse
    {
        $this->autorizarTarea($request, $tarea);

        $datos = $request->validate([
            'titulo' => ['sometimes', 'required', 'string', 'max:150'],
            'descripcion' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'estado' => [
                'sometimes',
                'required',
                Rule::in(['pendiente', 'en_progreso', 'completada']),
            ],
            'fecha_entrega' => ['sometimes', 'nullable', 'date'],
            'prioridad' => [
                'sometimes',
                'required',
                Rule::in(['baja', 'media', 'alta']),
            ],
        ]);

        $datos = $this->normalizarFechaEntrega($datos);

        $tarea->update($datos);

        if ($tarea->wasChanged(['titulo', 'fecha_entrega', 'estado'])) {
            app(AcademicReminderService::class)->invalidarRecordatoriosDe($tarea);
        }

        return response()->json([
            'message' => 'Tarea actualizada correctamente.',
            'tarea' => $tarea->fresh(),
        ]);
    }

    public function destroy(Request $request, Tarea $tarea): JsonResponse
    {
        $this->autorizarTarea($request, $tarea);

        app(AcademicReminderService::class)->invalidarRecordatoriosDe($tarea);
        $tarea->delete();

        return response()->json([
            'message' => 'Tarea eliminada correctamente.',
        ]);
    }

    private function autorizarMateria(
        Request $request,
        Materia $materia
    ): void {
        abort_unless(
            $materia->user_id === $request->user()->id,
            403,
            'No tienes permiso para gestionar esta materia.'
        );
    }

    private function autorizarTarea(
        Request $request,
        Tarea $tarea
    ): void {
        abort_unless(
            $tarea->materia()->where('user_id', $request->user()->id)->exists(),
            403,
            'No tienes permiso para gestionar esta tarea.'
        );
    }

    /**
     * Store API timestamps as UTC database values. The frontend sends ISO-8601
     * timestamps so browser-local times remain unambiguous across time zones.
     *
     * @param  array<string, mixed>  $datos
     * @return array<string, mixed>
     */
    private function normalizarFechaEntrega(array $datos): array
    {
        if (isset($datos['fecha_entrega'])) {
            $datos['fecha_entrega'] = Carbon::parse($datos['fecha_entrega'])
                ->utc()
                ->format('Y-m-d H:i:s');
        }

        return $datos;
    }
}
