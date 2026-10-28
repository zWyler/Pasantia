<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SprintTwoAcademicTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_list_show_update_and_delete_materias(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        Sanctum::actingAs($user);

        $created = $this->postJson('/api/materias', [
            'nombre' => 'Historia',
            'descripcion' => 'Historia universal',
        ])->assertCreated()
            ->assertJsonPath('materia.nombre', 'Historia')
            ->assertJsonPath('materia.descripcion', 'Historia universal')
            ->json('materia');

        $this->postJson('/api/materias', [
            'nombre' => 'Historia',
            'descripcion' => 'Duplicada para la misma persona',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('nombre');

        $this->postJson('/api/materias', [
            'nombre' => 'Arte',
            'descripcion' => str_repeat('x', 5001),
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('descripcion');

        Sanctum::actingAs($other);
        $otherMateria = $this->postJson('/api/materias', [
            'nombre' => 'Historia',
        ])->assertCreated()->json('materia');
        $this->assertNotSame($created['id'], $otherMateria['id']);

        Sanctum::actingAs($user);
        $this->getJson('/api/materias')->assertOk()
            ->assertJsonFragment(['id' => $created['id']])
            ->assertJsonMissing(['id' => $otherMateria['id']]);
        $this->getJson('/api/materias/'.$created['id'])
            ->assertOk()->assertJsonPath('materia.id', $created['id']);

        $this->patchJson('/api/materias/'.$created['id'], [
            'nombre' => 'Historia II',
            'descripcion' => null,
        ])->assertOk()
            ->assertJsonPath('materia.nombre', 'Historia II')
            ->assertJsonPath('materia.descripcion', null);

        $this->deleteJson('/api/materias/'.$created['id'])->assertOk();
        $this->assertDatabaseMissing('materias', ['id' => $created['id']]);
    }

    public function test_task_states_priorities_and_utc_due_dates_are_validated_and_persisted(): void
    {
        $user = User::factory()->create();
        $materia = $user->materias()->create(['nombre' => 'Ciencias']);
        Sanctum::actingAs($user);

        $task = $this->postJson('/api/materias/'.$materia->id.'/tareas', [
            'titulo' => 'Experimento',
            'descripcion' => 'Medir los resultados',
            'fecha_entrega' => null,
            'prioridad' => 'baja',
            'estado' => 'pendiente',
        ])->assertCreated()
            ->assertJsonPath('tarea.descripcion', 'Medir los resultados')
            ->assertJsonPath('tarea.fecha_entrega', null)
            ->assertJsonPath('tarea.prioridad', 'baja')
            ->assertJsonPath('tarea.estado', 'pendiente')
            ->json('tarea');

        foreach (['en_progreso', 'completada', 'pendiente'] as $estado) {
            $this->patchJson('/api/tareas/'.$task['id'], [
                'estado' => $estado,
            ])->assertOk()->assertJsonPath('tarea.estado', $estado);
        }

        $this->patchJson('/api/tareas/'.$task['id'], [
            'prioridad' => 'media',
        ])->assertOk()->assertJsonPath('tarea.prioridad', 'media');

        $this->patchJson('/api/tareas/'.$task['id'], [
            'prioridad' => 'alta',
            'fecha_entrega' => '2026-11-01T12:30:00-04:00',
        ])->assertOk()
            ->assertJsonPath('tarea.prioridad', 'alta')
            ->assertJsonPath('tarea.fecha_entrega', '2026-11-01T16:30:00.000000Z');

        $this->assertDatabaseHas('tareas', [
            'id' => $task['id'],
            'materia_id' => $materia->id,
            'estado' => 'pendiente',
            'prioridad' => 'alta',
            'fecha_entrega' => '2026-11-01 16:30:00',
        ]);

        $this->patchJson('/api/tareas/'.$task['id'], [
            'fecha_entrega' => null,
            'descripcion' => null,
        ])->assertOk()->assertJsonPath('tarea.fecha_entrega', null);

        $this->assertDatabaseHas('tareas', [
            'id' => $task['id'],
            'fecha_entrega' => null,
            'descripcion' => null,
        ]);
    }

    public function test_invalid_task_states_priorities_and_dates_are_rejected(): void
    {
        $user = User::factory()->create();
        $materia = $user->materias()->create(['nombre' => 'Química']);
        $task = $materia->tareas()->create(['titulo' => 'Informe']);
        Sanctum::actingAs($user);

        $this->postJson('/api/materias/'.$materia->id.'/tareas', [
            'titulo' => 'Estado desconocido',
            'estado' => 'archivada',
        ])->assertUnprocessable()->assertJsonValidationErrors('estado');

        $this->postJson('/api/materias/'.$materia->id.'/tareas', [
            'titulo' => 'Prioridad desconocida',
            'prioridad' => 'urgente',
        ])->assertUnprocessable()->assertJsonValidationErrors('prioridad');

        $this->postJson('/api/materias/'.$materia->id.'/tareas', [
            'titulo' => 'Fecha inválida',
            'fecha_entrega' => 'no-es-una-fecha',
        ])->assertUnprocessable()->assertJsonValidationErrors('fecha_entrega');

        $this->postJson('/api/materias/'.$materia->id.'/tareas', [
            'titulo' => str_repeat('x', 151),
            'descripcion' => 'Detalles',
        ])->assertUnprocessable()->assertJsonValidationErrors('titulo');

        $this->patchJson('/api/tareas/'.$task->id, [
            'estado' => 'en_progreso',
            'prioridad' => 'crítica',
            'fecha_entrega' => '2026-02-30T12:00:00Z',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['prioridad', 'fecha_entrega']);

        $this->assertDatabaseHas('tareas', [
            'id' => $task->id,
            'estado' => 'pendiente',
            'prioridad' => 'media',
            'fecha_entrega' => null,
        ]);
    }

    public function test_deleting_a_materia_cascades_to_its_tareas(): void
    {
        $user = User::factory()->create();
        $materia = $user->materias()->create(['nombre' => 'Geografía']);
        $first = $materia->tareas()->create(['titulo' => 'Mapa']);
        $second = $materia->tareas()->create(['titulo' => 'Exposición']);
        Sanctum::actingAs($user);

        $this->deleteJson('/api/materias/'.$materia->id)->assertOk();

        $this->assertDatabaseMissing('materias', ['id' => $materia->id]);
        $this->assertDatabaseMissing('tareas', ['id' => $first->id]);
        $this->assertDatabaseMissing('tareas', ['id' => $second->id]);
    }

    public function test_user_cannot_create_a_task_under_another_users_materia(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $materia = $owner->materias()->create(['nombre' => 'Materia privada']);
        Sanctum::actingAs($other);

        $this->postJson('/api/materias/'.$materia->id.'/tareas', [
            'titulo' => 'No debe crearse',
        ])->assertForbidden();

        $this->assertDatabaseCount('tareas', 0);
    }

    public function test_task_search_matches_title_or_description_and_returns_empty_results(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $materia = $user->materias()->create(['nombre' => 'Literatura']);
        $privateMateria = $other->materias()->create(['nombre' => 'Privada']);
        $titleMatch = $materia->tareas()->create([
            'titulo' => 'Ensayo sobre poesía',
            'descripcion' => 'Lectura asignada',
        ]);
        $descriptionMatch = $materia->tareas()->create([
            'titulo' => 'Lectura semanal',
            'descripcion' => 'Preparar análisis de poesía moderna',
        ]);
        $privateMateria->tareas()->create([
            'titulo' => 'Poesía privada',
            'descripcion' => 'No debe aparecer',
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/tareas?q=poesía')->assertOk()
            ->assertJsonCount(2, 'tareas')
            ->assertJsonFragment(['id' => $titleMatch->id])
            ->assertJsonFragment(['id' => $descriptionMatch->id]);

        $this->getJson('/api/tareas?q=texto-inexistente')->assertOk()
            ->assertExactJson(['tareas' => []]);
    }

    public function test_task_filters_combine_materia_status_priority_and_inclusive_date_range(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $materia = $user->materias()->create(['nombre' => 'Biología']);
        $otraMateria = $user->materias()->create(['nombre' => 'Química']);
        $privateMateria = $other->materias()->create(['nombre' => 'Biología ajena']);

        $desde = $materia->tareas()->create([
            'titulo' => 'Límite inicial',
            'estado' => 'pendiente',
            'prioridad' => 'alta',
            'fecha_entrega' => '2026-11-01 00:00:00',
        ]);
        $hasta = $materia->tareas()->create([
            'titulo' => 'Límite final',
            'estado' => 'pendiente',
            'prioridad' => 'alta',
            'fecha_entrega' => '2026-11-05 23:59:59',
        ]);
        $materia->tareas()->create([
            'titulo' => 'Prioridad distinta',
            'estado' => 'pendiente',
            'prioridad' => 'media',
            'fecha_entrega' => '2026-11-03 12:00:00',
        ]);
        $materia->tareas()->create([
            'titulo' => 'Fuera del rango',
            'estado' => 'pendiente',
            'prioridad' => 'alta',
            'fecha_entrega' => '2026-11-06 00:00:00',
        ]);
        $otraMateria->tareas()->create([
            'titulo' => 'Otra materia',
            'estado' => 'pendiente',
            'prioridad' => 'alta',
            'fecha_entrega' => '2026-11-03 12:00:00',
        ]);
        $privateMateria->tareas()->create([
            'titulo' => 'Tarea privada',
            'estado' => 'pendiente',
            'prioridad' => 'alta',
            'fecha_entrega' => '2026-11-03 12:00:00',
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/tareas?materia_id='.$materia->id
            .'&estado=pendiente&prioridad=alta&fecha_desde=2026-11-01&fecha_hasta=2026-11-05')
            ->assertOk()
            ->assertJsonCount(2, 'tareas')
            ->assertJsonPath('tareas.0.id', $desde->id)
            ->assertJsonPath('tareas.1.id', $hasta->id);

        $this->getJson('/api/tareas?materia_id='.$materia->id.'&fecha_hasta=2026-11-05')
            ->assertOk()
            ->assertJsonCount(3, 'tareas');

        $this->getJson('/api/tareas?materia_id='.$privateMateria->id)->assertForbidden();
    }

    public function test_task_search_supports_allowed_sorting_and_validates_filter_parameters(): void
    {
        $user = User::factory()->create();
        $materia = $user->materias()->create(['nombre' => 'Arte']);
        $alta = $materia->tareas()->create(['titulo' => 'Zeta', 'prioridad' => 'alta']);
        $baja = $materia->tareas()->create(['titulo' => 'Alfa', 'prioridad' => 'baja']);
        $media = $materia->tareas()->create(['titulo' => 'Beta', 'prioridad' => 'media']);
        Sanctum::actingAs($user);

        $this->getJson('/api/tareas?ordenar_por=prioridad&direccion=asc')->assertOk()
            ->assertJsonPath('tareas.0.id', $baja->id)
            ->assertJsonPath('tareas.1.id', $media->id)
            ->assertJsonPath('tareas.2.id', $alta->id);
        $this->getJson('/api/tareas?ordenar_por=titulo&direccion=desc')->assertOk()
            ->assertJsonPath('tareas.0.id', $alta->id);

        $this->getJson('/api/tareas?ordenar_por=created_at')->assertUnprocessable()
            ->assertJsonValidationErrors('ordenar_por');
        $this->getJson('/api/tareas?direccion=sideways')->assertUnprocessable()
            ->assertJsonValidationErrors('direccion');
        $this->getJson('/api/tareas?estado=archivada')->assertUnprocessable()
            ->assertJsonValidationErrors('estado');
        $this->getJson('/api/tareas?prioridad=urgente')->assertUnprocessable()
            ->assertJsonValidationErrors('prioridad');
        $this->getJson('/api/tareas?fecha_desde=2026-11-10&fecha_hasta=2026-11-01')
            ->assertUnprocessable()->assertJsonValidationErrors('fecha_hasta');
        $this->getJson('/api/tareas?fecha_desde=2026-02-30')
            ->assertUnprocessable()->assertJsonValidationErrors('fecha_desde');
        $this->getJson('/api/tareas?q[]=valor')
            ->assertUnprocessable()->assertJsonValidationErrors('q');
        $this->getJson('/api/tareas?zona_horaria=invalid-zone')
            ->assertUnprocessable()->assertJsonValidationErrors('zona_horaria');
    }

    public function test_date_filter_uses_inclusive_days_in_the_supplied_local_timezone(): void
    {
        $user = User::factory()->create();
        $materia = $user->materias()->create(['nombre' => 'Astronomía']);
        $beforeLocalStart = $materia->tareas()->create([
            'titulo' => 'Antes del inicio local',
            'fecha_entrega' => '2026-11-01 03:59:59',
        ]);
        $atLocalStart = $materia->tareas()->create([
            'titulo' => 'Inicio local',
            'fecha_entrega' => '2026-11-01 04:00:00',
        ]);
        $atLocalEnd = $materia->tareas()->create([
            'titulo' => 'Fin local',
            'fecha_entrega' => '2026-11-06 03:59:59',
        ]);
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/tareas?fecha_desde=2026-11-01&fecha_hasta=2026-11-05&zona_horaria=America%2FSanto_Domingo')
            ->assertOk()
            ->assertJsonCount(2, 'tareas');

        $this->assertSame(
            [$atLocalStart->id, $atLocalEnd->id],
            collect($response->json('tareas'))->pluck('id')->all()
        );
    }

    public function test_global_task_search_requires_authentication_and_keeps_existing_crud_available(): void
    {
        $user = User::factory()->create();
        $materia = $user->materias()->create(['nombre' => 'Física']);
        $this->getJson('/api/tareas')->assertUnauthorized();

        Sanctum::actingAs($user);
        $task = $this->postJson('/api/materias/'.$materia->id.'/tareas', [
            'titulo' => 'Práctica',
        ])->assertCreated()->json('tarea');

        $this->getJson('/api/materias/'.$materia->id.'/tareas')->assertOk()
            ->assertJsonFragment(['id' => $task['id']]);
        $this->getJson('/api/tareas')->assertOk()
            ->assertJsonFragment(['id' => $task['id']]);
        $this->patchJson('/api/tareas/'.$task['id'], ['titulo' => 'Práctica corregida'])
            ->assertOk()->assertJsonPath('tarea.titulo', 'Práctica corregida');
        $this->deleteJson('/api/tareas/'.$task['id'])->assertOk();
    }

    public function test_calendar_feed_returns_multiple_dated_and_undated_tasks_only_for_the_owner(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();
        $materia = $user->materias()->create(['nombre' => 'Cálculo']);
        $privateMateria = $other->materias()->create(['nombre' => 'Cálculo privado']);
        $first = $materia->tareas()->create([
            'titulo' => 'Parcial',
            'estado' => 'pendiente',
            'prioridad' => 'alta',
            'fecha_entrega' => '2026-12-31 15:00:00',
        ]);
        $second = $materia->tareas()->create([
            'titulo' => 'Repaso',
            'estado' => 'en_progreso',
            'prioridad' => 'media',
            'fecha_entrega' => '2026-12-31 18:00:00',
        ]);
        $withoutDate = $materia->tareas()->create([
            'titulo' => 'Lectura sin fecha',
            'estado' => 'completada',
            'prioridad' => 'baja',
            'fecha_entrega' => null,
        ]);
        $private = $privateMateria->tareas()->create([
            'titulo' => 'Tarea privada',
            'fecha_entrega' => '2026-12-31 20:00:00',
        ]);
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/tareas?ordenar_por=fecha_entrega')->assertOk();
        $tareas = collect($response->json('tareas'));

        $this->assertSame(
            [$first->id, $second->id, $withoutDate->id],
            $tareas->pluck('id')->all()
        );
        $this->assertNotContains($private->id, $tareas->pluck('id')->all());
        $this->assertNull($tareas->last()['fecha_entrega']);
        $this->assertSame('pendiente', $tareas->first()['estado']);
        $this->assertSame('alta', $tareas->first()['prioridad']);
        $this->assertSame('en_progreso', $tareas[1]['estado']);
        $this->assertSame('media', $tareas[1]['prioridad']);
        $this->assertSame('completada', $tareas[2]['estado']);
        $this->assertSame('baja', $tareas[2]['prioridad']);
    }
}
