<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Auth\Notifications\ResetPassword;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SprintOneSecurityTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_validates_password_and_hides_private_fields(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'Ana Estudiante',
            'email' => 'ana@example.test',
            'password' => 'StudyHub!2026',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors('password');

        $response = $this->postJson('/api/register', [
            'name' => 'Ana Estudiante',
            'email' => 'ana@example.test',
            'password' => 'ClaveSegura!2026',
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.email', 'ana@example.test')
            ->assertJsonMissingPath('user.password')
            ->assertJsonMissingPath('user.failed_login_attempts')
            ->assertJsonMissingPath('user.locked_until')
            ->assertJsonMissingPath('user.lock_level');

        $user = User::where('email', 'ana@example.test')->firstOrFail();
        $this->assertTrue(Hash::check('ClaveSegura!2026', $user->password));

        $this->postJson('/api/register', [
            'name' => 'Ana Estudiante',
            'email' => 'ana@example.test',
            'password' => 'ClaveSegura!2026',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        $this->postJson('/api/register', [
            'name' => 'Ana Estudiante',
            'email' => str_repeat('a', 250).'@example.test',
            'password' => 'ClaveSegura!2026',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('email');
    }

    public function test_login_issues_a_bearer_token_and_logout_revokes_it(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('ClaveCorrecta!2026'),
        ]);

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'incorrecta',
        ])->assertUnauthorized();

        $login = $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'ClaveCorrecta!2026',
        ])->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email']])
            ->assertJsonMissingPath('user.failed_login_attempts');

        $token = $login->json('token');

        $this->withToken($token)->getJson('/api/me')->assertOk()
            ->assertJsonPath('user.id', $user->id);

        $this->withToken($token)->postJson('/api/logout')->assertOk();
        $this->assertDatabaseCount('personal_access_tokens', 0);
        Auth::forgetGuards();

        $this->withToken($token)->getJson('/api/me')->assertUnauthorized();
    }

    public function test_authentication_endpoints_are_rate_limited(): void
    {
        for ($intento = 0; $intento < 10; $intento++) {
            $this->postJson('/api/login', [
                'email' => 'inexistente@example.test',
                'password' => 'ClaveIncorrecta123',
            ])->assertUnauthorized();
        }

        $this->postJson('/api/login', [
            'email' => 'inexistente@example.test',
            'password' => 'ClaveIncorrecta123',
        ])->assertTooManyRequests();
    }

    public function test_bearer_tokens_expire_after_the_configured_lifetime(): void
    {
        config(['sanctum.expiration' => 1]);

        $user = User::factory()->create();
        $token = $user->createToken('expiration-test')->plainTextToken;
        $tokenId = explode('|', $token, 2)[0];
        $user->tokens()->whereKey($tokenId)->update([
            'created_at' => now()->subMinutes(2),
        ]);

        $this->withToken($token)->getJson('/api/me')->assertUnauthorized();
    }

    public function test_password_recovery_sends_email_resets_password_and_revokes_tokens(): void
    {
        Notification::fake();
        $user = User::factory()->create();
        $oldToken = $user->createToken('before-reset')->plainTextToken;

        $this->postJson('/api/forgot-password', ['email' => $user->email])
            ->assertOk()
            ->assertJsonPath(
                'message',
                'Si el correo está registrado, recibirás un enlace de recuperación.'
            );

        $resetToken = null;
        Notification::assertSentTo(
            $user,
            ResetPassword::class,
            function (ResetPassword $notification) use (&$resetToken): bool {
                $resetToken = $notification->token;

                return true;
            }
        );

        $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'token' => $resetToken,
            'password' => 'NuevaClave!2026',
            'password_confirmation' => 'NuevaClave!2026',
        ])->assertOk();

        $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'token' => $resetToken,
            'password' => 'OtraClave!2026',
            'password_confirmation' => 'OtraClave!2026',
        ])->assertUnprocessable();

        $this->withToken($oldToken)->getJson('/api/me')->assertUnauthorized();

        $this->postJson('/api/login', [
            'email' => $user->email,
            'password' => 'NuevaClave!2026',
        ])->assertOk();
    }

    public function test_password_recovery_rejects_expired_reset_tokens(): void
    {
        Notification::fake();
        $user = User::factory()->create([
            'password' => Hash::make('ClaveAnterior!2026'),
        ]);

        $this->postJson('/api/forgot-password', ['email' => $user->email])
            ->assertOk();

        $resetToken = null;
        Notification::assertSentTo(
            $user,
            ResetPassword::class,
            function (ResetPassword $notification) use (&$resetToken): bool {
                $resetToken = $notification->token;

                return true;
            }
        );

        $this->travel(61)->minutes();

        $this->postJson('/api/reset-password', [
            'email' => $user->email,
            'token' => $resetToken,
            'password' => 'NuevaClave!2026',
            'password_confirmation' => 'NuevaClave!2026',
        ])->assertUnprocessable();

        $this->assertTrue(Hash::check('ClaveAnterior!2026', $user->fresh()->password));
    }

    public function test_password_recovery_does_not_disclose_unknown_accounts(): void
    {
        $known = $this->postJson('/api/forgot-password', [
            'email' => 'known@example.test',
        ]);
        $unknown = $this->postJson('/api/forgot-password', [
            'email' => 'unknown@example.test',
        ]);

        $known->assertOk();
        $unknown->assertOk();
        $this->assertSame($known->json('message'), $unknown->json('message'));
    }

    public function test_protected_routes_reject_requests_without_a_token(): void
    {
        $this->getJson('/api/me')->assertUnauthorized();
        $this->putJson('/api/profile', ['name' => 'Intruso', 'email' => 'x@example.test'])
            ->assertUnauthorized();
        $this->getJson('/api/materias')->assertUnauthorized();
    }

    public function test_profile_update_only_changes_the_authenticated_user(): void
    {
        $user = User::factory()->create(['name' => 'Titular']);
        $other = User::factory()->create(['name' => 'Otra cuenta']);
        Sanctum::actingAs($user);

        $this->putJson('/api/profile', [
            'user_id' => $other->id,
            'name' => 'Nombre actualizado',
            'email' => 'actualizado@example.test',
        ])->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.name', 'Nombre actualizado');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'Nombre actualizado',
            'email' => 'actualizado@example.test',
        ]);
        $this->assertDatabaseHas('users', [
            'id' => $other->id,
            'name' => 'Otra cuenta',
            'email' => $other->email,
        ]);
    }

    public function test_owner_can_manage_own_materia_and_tarea_without_trusting_client_ids(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $otherMateria = $other->materias()->create([
            'nombre' => 'Materia de otra persona',
        ]);
        Sanctum::actingAs($owner);

        $createdMateria = $this->postJson('/api/materias', [
            'user_id' => $other->id,
            'nombre' => 'Matemáticas',
        ])->assertCreated()->json('materia');

        $this->assertSame($owner->id, $createdMateria['user_id']);
        $this->getJson('/api/materias')->assertOk()
            ->assertJsonFragment(['id' => $createdMateria['id']])
            ->assertJsonMissing(['id' => $otherMateria->id]);
        $this->getJson('/api/materias/'.$createdMateria['id'])
            ->assertOk()->assertJsonPath('materia.id', $createdMateria['id']);

        $this->putJson('/api/materias/'.$createdMateria['id'], [
            'nombre' => 'Matemáticas II',
            'user_id' => $other->id,
        ])->assertOk();
        $this->assertDatabaseHas('materias', [
            'id' => $createdMateria['id'],
            'user_id' => $owner->id,
            'nombre' => 'Matemáticas II',
        ]);

        $createdTask = $this->postJson(
            '/api/materias/'.$createdMateria['id'].'/tareas',
            [
                'titulo' => 'Primer ejercicio',
                'materia_id' => $otherMateria->id,
            ]
        )->assertCreated()->json('tarea');

        $this->assertSame($createdMateria['id'], $createdTask['materia_id']);
        $this->getJson('/api/materias/'.$createdMateria['id'].'/tareas')
            ->assertOk()->assertJsonFragment(['id' => $createdTask['id']]);
        $this->getJson('/api/tareas/'.$createdTask['id'])
            ->assertOk()->assertJsonPath('tarea.id', $createdTask['id']);

        $this->patchJson('/api/tareas/'.$createdTask['id'], [
            'titulo' => 'Ejercicio actualizado',
            'materia_id' => $otherMateria->id,
        ])->assertOk();

        $this->assertDatabaseHas('tareas', [
            'id' => $createdTask['id'],
            'materia_id' => $createdMateria['id'],
            'titulo' => 'Ejercicio actualizado',
        ]);

        $this->deleteJson('/api/tareas/'.$createdTask['id'])->assertOk();
        $this->deleteJson('/api/materias/'.$createdMateria['id'])->assertOk();
    }

    public function test_user_cannot_read_another_users_tasks(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();
        $materia = $owner->materias()->create([
            'nombre' => 'Privada',
        ]);
        $task = $materia->tareas()->create([
            'titulo' => 'Tarea privada',
        ]);
        Sanctum::actingAs($attacker);

        $response = $this->getJson('/api/materias/'.$materia->id.'/tareas');

        $response->assertJsonMissing(['titulo' => 'Tarea privada'])
            ->assertForbidden();
        $this->assertDatabaseHas('tareas', [
            'id' => $task->id,
            'materia_id' => $materia->id,
        ]);
    }

    public function test_user_cannot_read_update_or_delete_another_users_resources(): void
    {
        $owner = User::factory()->create();
        $attacker = User::factory()->create();
        $materia = $owner->materias()->create([
            'nombre' => 'Materia ajena',
        ]);
        $task = $materia->tareas()->create([
            'titulo' => 'Tarea ajena',
        ]);
        Sanctum::actingAs($attacker);

        $this->getJson('/api/materias')->assertOk()
            ->assertJsonMissing(['id' => $materia->id]);
        $this->getJson('/api/materias/'.$materia->id)->assertForbidden();
        $this->putJson('/api/materias/'.$materia->id, [
            'nombre' => 'Alterada',
            'user_id' => $attacker->id,
        ])->assertForbidden();
        $this->deleteJson('/api/materias/'.$materia->id)->assertForbidden();

        $this->getJson('/api/materias/'.$materia->id.'/tareas')->assertForbidden();
        $this->postJson('/api/materias/'.$materia->id.'/tareas', [
            'titulo' => 'Inyección',
        ])->assertForbidden();
        $this->getJson('/api/tareas/'.$task->id)->assertForbidden();
        $this->patchJson('/api/tareas/'.$task->id, [
            'titulo' => 'Alterada',
            'materia_id' => $attacker->id,
        ])->assertForbidden();
        $this->deleteJson('/api/tareas/'.$task->id)->assertForbidden();

        $this->assertDatabaseHas('materias', [
            'id' => $materia->id,
            'user_id' => $owner->id,
            'nombre' => 'Materia ajena',
        ]);
        $this->assertDatabaseHas('tareas', [
            'id' => $task->id,
            'materia_id' => $materia->id,
            'titulo' => 'Tarea ajena',
        ]);
    }
}
