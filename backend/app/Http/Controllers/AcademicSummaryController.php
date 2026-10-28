<?php

namespace App\Http\Controllers;

use App\Services\AcademicStatisticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AcademicSummaryController extends Controller
{
    public function __construct(
        private readonly AcademicStatisticsService $estadisticas
    ) {
    }

    public function dashboard(Request $request): JsonResponse
    {
        return response()->json([
            'resumen' => $this->estadisticas->dashboard($request->user()),
        ]);
    }

    public function estadisticas(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'periodo' => [
                'sometimes',
                'required',
                Rule::in(['ultimos_7_dias', 'ultimos_30_dias', 'mes_actual', 'todo']),
            ],
        ]);

        return response()->json([
            'estadisticas' => $this->estadisticas->estadisticas(
                $request->user(),
                $datos['periodo'] ?? 'todo'
            ),
        ]);
    }
}
