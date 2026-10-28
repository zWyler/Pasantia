<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('studyhub:generar-recordatorios')
    ->cron(config('academic_reminders.schedule_expression', '*/5 * * * *'))
    ->timezone(config('academic_reminders.timezone', 'UTC'))
    ->withoutOverlapping(10);
