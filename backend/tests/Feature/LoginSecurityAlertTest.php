<?php

namespace Tests\Feature;

use App\Mail\LoginSecurityAlertMail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class LoginSecurityAlertTest extends TestCase
{
    use RefreshDatabase;

    public function test_three_failed_login_attempts_send_security_alert(): void
    {
        Mail::fake();

        $usuario = User::factory()->create([
            'email' => 'usuario@studyhub.test',
            'password' => Hash::make('ClaveCorrecta123'),
            'failed_login_attempts' => 0,
            'locked_until' => null,
            'lock_level' => 0,
        ]);

        for ($i = 0; $i < 3; $i++) {
            $this->postJson('/api/login', [
                'email' => $usuario->email,
                'password' => 'ClaveIncorrecta123',
            ]);
        }

        Mail::assertSent(LoginSecurityAlertMail::class, function ($mail) {
            return $mail->lockMinutes === 15;
        });
    }

public function test_lock_duration_increases_progressively(): void
{
    $usuario = User::factory()->create([
        'password' => Hash::make('ClaveCorrecta123'),
        'failed_login_attempts' => 2,
        'locked_until' => null,
        'lock_level' => 0,
    ]);

    $duracionesEsperadas = [15, 30, 60, 120, 240];

    $this->travelTo(now()->startOfSecond());

    foreach ($duracionesEsperadas as $minutos) {
        $respuesta = $this->postJson('/api/login', [
            'email' => $usuario->email,
            'password' => 'ClaveIncorrecta123',
        ]);

        $respuesta->assertStatus(423);

        $usuario->refresh();

        $this->assertEquals(
            now()->addMinutes($minutos)->timestamp,
            $usuario->locked_until->timestamp
        );

        $usuario->locked_until = null;
        $usuario->failed_login_attempts = 2;
        $usuario->save();
    }
}
    }