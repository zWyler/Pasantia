<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class SecurePassword implements ValidationRule
{
    public function validate(
        string $attribute,
        mixed $value,
        Closure $fail
    ): void {
        if (!is_string($value)) {
            $fail('La contraseña debe ser un texto válido.');
            return;
        }

        if (strlen($value) < 8) {
            $fail('La contraseña debe tener al menos 8 caracteres.');
        }

        if (!preg_match('/[a-z]/', $value)) {
            $fail('La contraseña debe contener al menos una letra minúscula.');
        }

        if (!preg_match('/[A-Z]/', $value)) {
            $fail('La contraseña debe contener al menos una letra mayúscula.');
        }

        if (!preg_match('/[0-9]/', $value)) {
            $fail('La contraseña debe contener al menos un número.');
        }

        if (!preg_match('/[^a-zA-Z0-9]/', $value)) {
            $fail('La contraseña debe contener al menos un carácter especial.');
        }

        if (stripos($value, 'StudyHub') !== false) {
            $fail('La contraseña no puede contener el nombre StudyHub.');
        }

        $formatosFecha = [
            'd/m/Y',
            'd-m-Y',
            'd.m.Y',
            'Y-m-d',
            'Y/m/d',
            'm/d/Y',
            'm-d-Y',
            'dmY',
            'Ymd',
        ];

        foreach ($formatosFecha as $formato) {
            $fecha = \DateTime::createFromFormat('!' . $formato, $value);
            $errores = \DateTime::getLastErrors();

            if (
                $fecha !== false
                && $fecha->format($formato) === $value
                && (
                    $errores === false
                    || (
                        $errores['warning_count'] === 0
                        && $errores['error_count'] === 0
                    )
                )
            ) {
                $fail('La contraseña no puede ser una fecha.');
                return;
            }
        }
    }
}