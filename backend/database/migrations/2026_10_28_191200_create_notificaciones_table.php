<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notificaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tarea_id')
                ->nullable()
                ->constrained('tareas')
                ->nullOnDelete();
            $table->string('tipo', 40);
            $table->string('titulo', 150);
            $table->text('mensaje');
            $table->dateTime('fecha_entrega_referencia')->nullable();
            $table->char('idempotency_key', 64)->unique();
            $table->timestamp('leida_en')->nullable();
            $table->timestamp('invalidada_en')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'leida_en', 'created_at']);
            $table->index(['tarea_id', 'tipo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notificaciones');
    }
};
