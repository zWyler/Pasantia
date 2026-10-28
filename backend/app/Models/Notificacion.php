<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notificacion extends Model
{
    protected $table = 'notificaciones';

    protected $fillable = [
        'user_id',
        'tarea_id',
        'tipo',
        'titulo',
        'mensaje',
        'fecha_entrega_referencia',
        'idempotency_key',
        'leida_en',
        'invalidada_en',
    ];

    protected $hidden = [
        'user_id',
        'fecha_entrega_referencia',
        'idempotency_key',
        'invalidada_en',
    ];

    protected function casts(): array
    {
        return [
            'fecha_entrega_referencia' => 'datetime',
            'leida_en' => 'datetime',
            'invalidada_en' => 'datetime',
        ];
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function tarea(): BelongsTo
    {
        return $this->belongsTo(Tarea::class, 'tarea_id');
    }
}
