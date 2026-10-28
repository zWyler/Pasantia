<?php

return [
    // Due dates are stored as UTC instants and no user timezone is stored yet.
    'timezone' => 'UTC',
    'upcoming_window_hours' => 24,
    'batch_size' => 500,
    'schedule_expression' => '*/5 * * * *',
];
