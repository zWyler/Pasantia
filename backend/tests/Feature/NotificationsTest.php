<?php

namespace Tests\Feature;

use App\Models\Notificacion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationsTest extends TestCase
{
    use RefreshDatabase;

    public function test_scheduler_generates_upcoming_due_today_and_overdue_reminders_once_for_task_owners(): void
    {
        $ahora = Carbon::parse('2026-11-15 12:00:00', 'UTC');
        $this->travelTo($ahora);
        $propietario = User::factory()->create();
        $otroUsuario = User::factory()->create();
        $materia = $propietario->materias()->create(['nombre' => 'Química']);
        $materiaAjena = $otroUsuario->materias()->create(['nombre' => 'Privada']);

        $materia->tareas()->create([
            'titulo' => 'Entrega mañana',
            'estado' => 'pendiente',
            'fecha_entrega' => '2026-11-16 08:00:00',
        ]);
        $materia->tareas()->create([
            'titulo' => 'Entrega hoy',
            'estado' => 'en_progreso',
            'fecha_entrega' => '2026-11-15 18:00:00',
        ]);
        $materia->tareas()->create([
            'titulo' => 'Ya venció',
            'estado' => 'pendiente',
            'fecha_entrega' => '2026-11-14 18:00:00',
        ]);
        $materia->tareas()->create([
            'titulo' => 'Completada',
            'estado' => 'completada',
            'fecha_entrega' => '2026-11-15 15:00:00',
        ]);
        $materia->tareas()->create([
            'titulo' => 'Sin fecha',
            'estado' => 'pendiente',
            'fecha_entrega' => null,
        ]);
        $materiaAjena->tareas()->create([
            'titulo' => 'Tarea privada',
            'estado' => 'pendiente',
            'fecha_entrega' => '2026-11-16 09:00:00',
        ]);

        $this->artisan('studyhub:generar-recordatorios')->assertExitCode(0);

        $this->assertDatabaseCount('notificaciones', 4);
        $this->assertDatabaseHas('notificaciones', ['tipo' => 'proxima_entrega', 'user_id' => $propietario->id]);
        $this->assertDatabaseHas('notificaciones', ['tipo' => 'entrega_hoy', 'user_id' => $propietario->id]);
        $this->assertDatabaseHas('notificaciones', ['tipo' => 'tarea_vencida', 'user_id' => $propietario->id]);
        $this->assertDatabaseHas('notificaciones', ['tipo' => 'proxima_entrega', 'user_id' => $otroUsuario->id]);

        $this->artisan('studyhub:generar-recordatorios')->assertExitCode(0);
        $this->assertDatabaseCount('notificaciones', 4);
    }

    public function test_due_date_changes_and_completion_invalidate_obsolete_reminders(): void
    {
        $this->travelTo(Carbon::parse('2026-11-15 12:00:00', 'UTC'));
        $usuario = User::factory()->create();
        $materia = $usuario->materias()->create(['nombre' => 'Física']);
        $tarea = $materia->tareas()->create([
            'titulo' => 'Informe',
            'estado' => 'pendiente',
            'fecha_entrega' => '2026-11-16 08:00:00',
        ]);

        $this->artisan('studyhub:generar-recordatorios')->assertExitCode(0);
        $recordatorioAnterior = Notificacion::query()->where('tarea_id', $tarea->id)->firstOrFail();

        Sanctum::actingAs($usuario);
        $this->patchJson('/api/tareas/'.$tarea->id, [
            'fecha_entrega' => '2026-11-16T09:00:00Z',
        ])->assertOk();

        $this->assertNotNull($recordatorioAnterior->fresh()->invalidada_en);
        $this->artisan('studyhub:generar-recordatorios')->assertExitCode(0);
        $recordatorioNuevo = Notificacion::query()
            ->where('tarea_id', $tarea->id)
            ->whereNull('invalidada_en')
            ->firstOrFail();
        $this->assertNotSame($recordatorioAnterior->id, $recordatorioNuevo->id);
        $this->assertSame('2026-11-16 09:00:00', $recordatorioNuevo->fecha_entrega_referencia->format('Y-m-d H:i:s'));

        $this->patchJson('/api/tareas/'.$tarea->id, ['estado' => 'completada'])->assertOk();
        $this->assertNotNull($recordatorioNuevo->fresh()->invalidada_en);
        $this->artisan('studyhub:generar-recordatorios')->assertExitCode(0);
        $this->assertSame(0, $usuario->notificaciones()->whereNull('invalidada_en')->count());
    }

    public function test_notifications_are_private_and_can_be_counted_read_marked_and_deleted(): void
    {
        $usuario = User::factory()->create();
        $otroUsuario = User::factory()->create();
        $materia = $usuario->materias()->create(['nombre' => 'Literatura']);
        $materiaAjena = $otroUsuario->materias()->create(['nombre' => 'Privada']);
        $tarea = $materia->tareas()->create(['titulo' => 'Ensayo']);
        $tareaAjena = $materiaAjena->tareas()->create(['titulo' => 'Tarea privada']);
        $propia = $this->crearNotificacion($usuario, $tarea, 'propia-1');
        $segunda = $this->crearNotificacion($usuario, $tarea, 'propia-2');
        $ajena = $this->crearNotificacion($otroUsuario, $tareaAjena, 'ajena-1');

        $this->getJson('/api/notificaciones')->assertUnauthorized();
        $this->getJson('/api/notificaciones/contador')->assertUnauthorized();
        $this->patchJson('/api/notificaciones/'.$propia->id.'/leer')->assertUnauthorized();
        $this->patchJson('/api/notificaciones/leer-todas')->assertUnauthorized();
        $this->deleteJson('/api/notificaciones/'.$propia->id)->assertUnauthorized();

        Sanctum::actingAs($usuario);
        $this->getJson('/api/notificaciones')->assertOk()
            ->assertJsonPath('paginacion.total', 2)
            ->assertJsonFragment(['id' => $propia->id])
            ->assertJsonFragment(['id' => $segunda->id])
            ->assertJsonMissing(['id' => $ajena->id])
            ->assertJsonPath('notificaciones.0.tarea.id', $tarea->id);
        $this->getJson('/api/notificaciones/contador')->assertOk()->assertJsonPath('no_leidas', 2);

        $this->patchJson('/api/notificaciones/'.$ajena->id.'/leer')->assertNotFound();
        $this->deleteJson('/api/notificaciones/'.$ajena->id)->assertNotFound();
        $this->assertNull($ajena->fresh()->leida_en);

        $respuestaLeida = $this->patchJson('/api/notificaciones/'.$propia->id.'/leer')->assertOk();
        $this->assertNotNull($respuestaLeida->json('notificacion.leida_en'));
        $this->getJson('/api/notificaciones/contador')->assertOk()->assertJsonPath('no_leidas', 1);
        $this->patchJson('/api/notificaciones/leer-todas')->assertOk()
            ->assertJsonPath('actualizadas', 1);
        $this->getJson('/api/notificaciones/contador')->assertOk()->assertJsonPath('no_leidas', 0);

        $this->deleteJson('/api/notificaciones/'.$propia->id)->assertOk();
        $this->assertDatabaseMissing('notificaciones', ['id' => $propia->id]);
        $this->getJson('/api/notificaciones?per_page=101')->assertUnprocessable()
            ->assertJsonValidationErrors('per_page');
    }

    public function test_title_changes_invalidate_reminder_messages_with_stale_titles(): void
    {
        $usuario = User::factory()->create();
        $materia = $usuario->materias()->create(['nombre' => 'Historia']);
        $tarea = $materia->tareas()->create([
            'titulo' => 'Título anterior',
            'fecha_entrega' => now('UTC')->addHours(3),
        ]);
        $notificacion = $this->crearNotificacion($usuario, $tarea, 'stale-title');
        Sanctum::actingAs($usuario);

        $this->patchJson('/api/tareas/'.$tarea->id, ['titulo' => 'Título actualizado'])->assertOk();

        $this->assertNotNull($notificacion->fresh()->invalidada_en);
        $this->getJson('/api/notificaciones')->assertOk()->assertJsonPath('paginacion.total', 0);
    }

    public function test_deleted_task_is_handled_without_an_invalid_foreign_key_or_active_reminder(): void
    {
        $usuario = User::factory()->create();
        $materia = $usuario->materias()->create(['nombre' => 'Arte']);
        $tarea = $materia->tareas()->create([
            'titulo' => 'Boceto',
            'fecha_entrega' => now('UTC')->addHours(2),
        ]);
        $notificacion = $this->crearNotificacion($usuario, $tarea, 'delete-task');
        Sanctum::actingAs($usuario);

        $this->deleteJson('/api/tareas/'.$tarea->id)->assertOk();

        $this->assertNull($notificacion->fresh()->tarea_id);
        $this->assertNotNull($notificacion->fresh()->invalidada_en);
        $this->getJson('/api/notificaciones')->assertOk()
            ->assertJsonPath('paginacion.total', 0);
    }

    private function crearNotificacion(User $usuario, $tarea, string $clave): Notificacion
    {
        return $usuario->notificaciones()->create([
            'tarea_id' => $tarea->id,
            'tipo' => 'proxima_entrega',
            'titulo' => 'Entrega próxima',
            'mensaje' => 'Recordatorio de prueba.',
            'fecha_entrega_referencia' => $tarea->fecha_entrega ?? now('UTC')->addDay(),
            'idempotency_key' => hash('sha256', $clave),
        ]);
    }
}
