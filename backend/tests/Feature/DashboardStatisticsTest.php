<?php

namespace Tests\Feature;

use App\Models\Materia;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardStatisticsTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_counts_real_owner_data_and_excludes_completed_tasks_from_overdue(): void
    {
        $ahora = Carbon::parse('2026-11-15 12:00:00', 'UTC');
        $this->travelTo($ahora);
        $usuario = User::factory()->create();
        $otroUsuario = User::factory()->create();
        $materia = $usuario->materias()->create(['nombre' => 'Biología']);
        $materiaAjena = $otroUsuario->materias()->create(['nombre' => 'Privada']);

        $materia->tareas()->create([
            'titulo' => 'Pendiente vencida',
            'estado' => 'pendiente',
            'fecha_entrega' => '2026-11-14 10:00:00',
        ]);
        $materia->tareas()->create([
            'titulo' => 'En progreso vencida',
            'estado' => 'en_progreso',
            'fecha_entrega' => '2026-11-15 11:00:00',
        ]);
        $materia->tareas()->create([
            'titulo' => 'Completada vencida',
            'estado' => 'completada',
            'fecha_entrega' => '2026-11-13 10:00:00',
        ]);
        $materia->tareas()->create([
            'titulo' => 'Próxima',
            'estado' => 'pendiente',
            'prioridad' => 'alta',
            'fecha_entrega' => '2026-11-16 10:00:00',
        ]);
        $materia->tareas()->create([
            'titulo' => 'Próxima cercana',
            'estado' => 'pendiente',
            'prioridad' => 'media',
            'fecha_entrega' => '2026-11-15 18:00:00',
        ]);
        $materia->tareas()->create([
            'titulo' => 'Sin fecha',
            'estado' => 'pendiente',
            'fecha_entrega' => null,
        ]);
        $materia->tareas()->create([
            'titulo' => 'Completada futura',
            'estado' => 'completada',
            'fecha_entrega' => '2026-11-17 10:00:00',
        ]);
        $materiaAjena->tareas()->create([
            'titulo' => 'Tarea de otra cuenta',
            'estado' => 'pendiente',
            'fecha_entrega' => '2026-11-16 08:00:00',
        ]);

        Sanctum::actingAs($usuario);

        $this->getJson('/api/dashboard/resumen')->assertOk()
            ->assertJsonPath('resumen.total_materias', 1)
            ->assertJsonPath('resumen.total_tareas', 7)
            ->assertJsonPath('resumen.tareas_pendientes', 4)
            ->assertJsonPath('resumen.tareas_en_progreso', 1)
            ->assertJsonPath('resumen.tareas_completadas', 2)
            ->assertJsonPath('resumen.tareas_vencidas', 2)
            ->assertJsonPath('resumen.proximas_entregas.0.titulo', 'Próxima cercana')
            ->assertJsonPath('resumen.proximas_entregas.1.titulo', 'Próxima')
            ->assertJsonPath('resumen.proximas_entregas.0.materia.nombre', 'Biología')
            ->assertJsonMissing(['titulo' => 'Tarea de otra cuenta'])
            ->assertJsonMissing(['titulo' => 'Completada futura']);
    }

    public function test_statistics_periods_use_creation_date_and_compute_status_and_priority_percentages(): void
    {
        $ahora = Carbon::parse('2026-11-15 12:00:00', 'UTC');
        $this->travelTo($ahora);
        $usuario = User::factory()->create();
        $otroUsuario = User::factory()->create();
        $materia = $usuario->materias()->create(['nombre' => 'Historia']);
        $materiaAjena = $otroUsuario->materias()->create(['nombre' => 'Historia privada']);

        $this->crearTareaEnFechaDeCreacion($materia, '2026-11-14 10:00:00', [
            'titulo' => 'Pendiente alta',
            'estado' => 'pendiente',
            'prioridad' => 'alta',
            'fecha_entrega' => '2026-11-14 09:00:00',
        ]);
        $this->crearTareaEnFechaDeCreacion($materia, '2026-11-10 10:00:00', [
            'titulo' => 'Completada media',
            'estado' => 'completada',
            'prioridad' => 'media',
            'fecha_entrega' => '2026-11-12 09:00:00',
        ]);
        $this->crearTareaEnFechaDeCreacion($materia, '2026-10-20 10:00:00', [
            'titulo' => 'En progreso baja',
            'estado' => 'en_progreso',
            'prioridad' => 'baja',
            'fecha_entrega' => '2026-11-20 09:00:00',
        ]);
        $this->crearTareaEnFechaDeCreacion($materia, '2026-10-10 10:00:00', [
            'titulo' => 'Pendiente sin fecha',
            'estado' => 'pendiente',
            'prioridad' => 'baja',
            'fecha_entrega' => null,
        ]);
        $this->crearTareaEnFechaDeCreacion($materiaAjena, '2026-11-14 11:00:00', [
            'titulo' => 'No incluir otra cuenta',
            'estado' => 'completada',
            'prioridad' => 'alta',
        ]);
        $this->travelTo($ahora);
        Sanctum::actingAs($usuario);

        $this->getJson('/api/estadisticas?periodo=ultimos_7_dias')->assertOk()
            ->assertJsonPath('estadisticas.total_tareas', 2)
            ->assertJsonPath('estadisticas.tareas_vencidas', 1)
            ->assertJsonPath('estadisticas.porcentaje_completadas', 50)
            ->assertJsonPath('estadisticas.porcentaje_pendientes', 50)
            ->assertJsonPath('estadisticas.porcentaje_en_progreso', 0)
            ->assertJsonPath('estadisticas.tasa_finalizacion', 50)
            ->assertJsonPath('estadisticas.prioridades.0.cantidad', 0)
            ->assertJsonPath('estadisticas.prioridades.1.cantidad', 1)
            ->assertJsonPath('estadisticas.prioridades.2.cantidad', 1)
            ->assertJsonPath('estadisticas.evolucion.disponible', false);

        $this->getJson('/api/estadisticas?periodo=ultimos_30_dias')->assertOk()
            ->assertJsonPath('estadisticas.total_tareas', 3)
            ->assertJsonPath('estadisticas.estados.1.cantidad', 1);

        $this->getJson('/api/estadisticas?periodo=mes_actual')->assertOk()
            ->assertJsonPath('estadisticas.total_tareas', 2);

        $this->getJson('/api/estadisticas?periodo=todo')->assertOk()
            ->assertJsonPath('estadisticas.total_tareas', 4)
            ->assertJsonPath('estadisticas.estados.0.cantidad', 2);
    }

    public function test_dashboard_and_statistics_handle_users_without_data_and_require_authentication(): void
    {
        $this->getJson('/api/dashboard/resumen')->assertUnauthorized();
        $this->getJson('/api/estadisticas')->assertUnauthorized();

        $usuario = User::factory()->create();
        Sanctum::actingAs($usuario);

        $this->getJson('/api/dashboard/resumen')->assertOk()
            ->assertJsonPath('resumen.total_materias', 0)
            ->assertJsonPath('resumen.total_tareas', 0)
            ->assertJsonPath('resumen.tareas_vencidas', 0)
            ->assertJsonPath('resumen.proximas_entregas', []);

        $this->getJson('/api/estadisticas?periodo=todo')->assertOk()
            ->assertJsonPath('estadisticas.total_tareas', 0)
            ->assertJsonPath('estadisticas.tasa_finalizacion', 0)
            ->assertJsonPath('estadisticas.porcentaje_completadas', 0)
            ->assertJsonPath('estadisticas.porcentaje_pendientes', 0)
            ->assertJsonPath('estadisticas.porcentaje_en_progreso', 0)
            ->assertJsonPath('estadisticas.prioridades.0.cantidad', 0)
            ->assertJsonPath('estadisticas.prioridades.1.cantidad', 0)
            ->assertJsonPath('estadisticas.prioridades.2.cantidad', 0);

        $this->getJson('/api/estadisticas?periodo=last_week')->assertUnprocessable()
            ->assertJsonValidationErrors('periodo');
    }

    private function crearTareaEnFechaDeCreacion(
        Materia $materia,
        string $creadaEn,
        array $datos
    ): void {
        $this->travelTo(Carbon::parse($creadaEn, 'UTC'));
        $materia->tareas()->create($datos);
    }
}
