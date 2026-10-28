<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
public function up(): void
{
    Schema::create('tareas', function (Blueprint $table) {
        $table->id();
        $table->foreignId('materia_id')
            ->constrained('materias')
            ->cascadeOnDelete();

        $table->string('titulo', 150);
        $table->text('descripcion')->nullable();
        $table->enum('estado', ['pendiente', 'en_progreso', 'completada'])
            ->default('pendiente');
        $table->dateTime('fecha_entrega')->nullable();
        $table->enum('prioridad', ['baja', 'media', 'alta'])
            ->default('media');
        $table->timestamps();

        $table->index(['materia_id', 'estado']);
        $table->index('fecha_entrega');
    });
}

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tareas');
    }
};
