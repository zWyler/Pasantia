<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LoginSecurityAlertMail extends Mailable
{
    use Queueable, SerializesModels;

    public int $lockMinutes;

    public function __construct(int $lockMinutes = 15)
    {
        $this->lockMinutes = $lockMinutes;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Alerta de seguridad - StudyHub',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.login-security-alert',
        );
    }

    public function attachments(): array
    {
        return [];
    }
}