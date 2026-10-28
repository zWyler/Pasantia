<?php

namespace App\Http\Controllers;

use App\Models\Materia;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class MateriaController extends Controller
{
    /**
     * Listar las materias del estudiante autenticado.
     */
    public function index(Request $request): JsonResponse
    {
        $materias = $request->user()
            ->materias()
            ->orderBy('nombre')
            ->get();

        return response()->json([
            'materias' => $materias,
        ]);
    }

    /**
     * Crear una materia.
     */
    public function store(Request $request): JsonResponse
    {
        $datos = $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:100',
                Rule::unique('materias', 'nombre')
                    ->where('user_id', $request->user()->id),
            ],
            'descripcion' => ['nullable', 'string', 'max:5000'],
        ]);

        $materia = $request->user()
            ->materias()
            ->create($datos);

        return response()->json([
            'message' => 'Materia creada correctamente.',
            'materia' => $materia,
        ], 201);
    }

    /**
     * Consultar una materia propia.
     */
    public function show(Request $request, Materia $materia): JsonResponse
    {
        $this->autorizarPropietario($request, $materia);

        return response()->json([
            'materia' => $materia,
        ]);
    }

    /**
     * Actualizar una materia propia.
     */
    public function update(Request $request, Materia $materia): JsonResponse
    {
        $this->autorizarPropietario($request, $materia);

        $datos = $request->validate([
            'nombre' => [
                'sometimes',
                'required',
                'string',
                'max:100',
                Rule::unique('materias', 'nombre')
                    ->where('user_id', $request->user()->id)
                    ->ignore($materia->id),
            ],
            'descripcion' => ['sometimes', 'nullable', 'string', 'max:5000'],
        ]);

        $materia->update($datos);

        return response()->json([
            'message' => 'Materia actualizada correctamente.',
            'materia' => $materia->fresh(),
        ]);
    }

    /**
     * Eliminar una materia propia.
     */
    public function destroy(Request $request, Materia $materia): JsonResponse
    {
        $this->autorizarPropietario($request, $materia);

        $materia->delete();

        return response()->json([
            'message' => 'Materia eliminada correctamente.',
        ]);
    }

    /**
     * Comprobar que la materia pertenece al estudiante autenticado.
     */
    private function autorizarPropietario(
        Request $request,
        Materia $materia
    ): void {
        abort_unless(
            $materia->user_id === $request->user()->id,
            403,
            'No tienes permiso para gestionar esta materia.'
        );
    }
}