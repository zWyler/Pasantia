<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Tarea extends Model
{
    protected $fillable = [
        'titulo',
        'descripcion',
        'estado',
        'fecha_entrega',
        'prioridad',
    ];

    protected function casts(): array
    {
        return [
            'fecha_entrega' => 'datetime',
        ];
    }

    public function materia(): BelongsTo
    {
        return $this->belongsTo(Materia::class);
    }

    public function notificaciones(): HasMany
    {
        return $this->hasMany(Notificacion::class, 'tarea_id');
    }
}
