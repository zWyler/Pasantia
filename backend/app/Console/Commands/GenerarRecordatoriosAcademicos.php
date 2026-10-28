<?php

namespace App\Console\Commands;

use App\Services\AcademicReminderService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

class GenerarRecordatoriosAcademicos extends Command
{
    protected $signature = 'studyhub:generar-recordatorios';

    protected $description = 'Genera recordatorios internos de fechas de entrega.';

    public function handle(AcademicReminderService $recordatorios): int
    {
        try {
            $cantidad = $recordatorios->generarRecordatorios();

            Log::info('Procesamiento de recordatorios académicos completado.', [
                'notificaciones_creadas' => $cantidad,
            ]);
            $this->info("Recordatorios creados: {$cantidad}");

            return self::SUCCESS;
        } catch (Throwable $error) {
            Log::error('Falló el procesamiento de recordatorios académicos.', [
                'tipo_error' => $error::class,
            ]);
            $this->error('No se pudieron procesar los recordatorios. Revisa el registro de la aplicación.');

            return self::FAILURE;
        }
    }
}
