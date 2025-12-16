<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class FcmService
{
    public function sendToTokens(array $tokens, array $message): array
    {
        $tokens = array_values(array_filter(array_unique($tokens)));
        if (count($tokens) === 0) {
            return ['success' => 0, 'failure' => 0, 'results' => []];
        }

        $serverKey = (string) config('services.firebase.server_key', '');
        if (!$serverKey) {
            return ['success' => 0, 'failure' => count($tokens), 'results' => [], 'error' => 'FCM server key missing'];
        }

        $payload = array_merge([
            'registration_ids' => $tokens,
            'priority' => 'high',
        ], $message);

        $res = Http::withHeaders([
            'Authorization' => 'key=' . $serverKey,
            'Content-Type' => 'application/json',
        ])->post('https://fcm.googleapis.com/fcm/send', $payload);

        if (!$res->ok()) {
            return [
                'success' => 0,
                'failure' => count($tokens),
                'results' => [],
                'status' => $res->status(),
                'body' => $res->body(),
            ];
        }

        return $res->json();
    }
}
