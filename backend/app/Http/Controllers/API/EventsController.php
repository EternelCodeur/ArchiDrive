<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Illuminate\Support\Facades\Cache;

class EventsController extends Controller
{
    public function users(Request $request)
    {
        $response = new StreamedResponse(function () {
            $last = Cache::get('users_events_sequence', 0);
            $start = time();
            while (true) {
                $current = Cache::get('users_events_sequence', 0);
                if ($current !== $last) {
                    echo "event: users\n";
                    echo 'data: {"seq":' . ((int)$current) . "}\n";
                    echo 'id: ' . ((int)$current) . "\n\n";
                    @ob_flush();
                    @flush();
                    $last = $current;
                }

                if ((time() - $start) > 60) {
                    break;
                }

                usleep(250000);
            }
        });

        $response->headers->set('Content-Type', 'text/event-stream');
        $response->headers->set('Cache-Control', 'no-cache');
        $response->headers->set('X-Accel-Buffering', 'no');
        $response->headers->set('Connection', 'keep-alive');

        return $response;
    }

    public function services(Request $request)
    {
        $response = new StreamedResponse(function () {
            $last = Cache::get('services_events_sequence', 0);
            $start = time();
            while (true) {
                $current = Cache::get('services_events_sequence', 0);
                if ($current !== $last) {
                    echo "event: services\n";
                    echo 'data: {"seq":' . ((int)$current) . "}\n";
                    echo 'id: ' . ((int)$current) . "\n\n";
                    @ob_flush();
                    @flush();
                    $last = $current;
                }

                if ((time() - $start) > 60) {
                    break;
                }

                usleep(250000);
            }
        });

        $response->headers->set('Content-Type', 'text/event-stream');
        $response->headers->set('Cache-Control', 'no-cache');
        $response->headers->set('X-Accel-Buffering', 'no');
        $response->headers->set('Connection', 'keep-alive');

        return $response;
    }

    public function employees(Request $request)
    {
        $response = new StreamedResponse(function () {
            $last = Cache::get('employees_events_sequence', 0);
            $start = time();
            while (true) {
                $current = Cache::get('employees_events_sequence', 0);
                if ($current !== $last) {
                    echo "event: employees\n";
                    echo 'data: {"seq":' . ((int)$current) . "}\n";
                    echo 'id: ' . ((int)$current) . "\n\n";
                    @ob_flush();
                    @flush();
                    $last = $current;
                }

                if ((time() - $start) > 60) {
                    break;
                }

                usleep(250000);
            }
        });

        $response->headers->set('Content-Type', 'text/event-stream');
        $response->headers->set('Cache-Control', 'no-cache');
        $response->headers->set('X-Accel-Buffering', 'no');
        $response->headers->set('Connection', 'keep-alive');

        return $response;
    }

    public function documents(Request $request)
    {
        $response = new StreamedResponse(function () {
            $last = Cache::get('documents_events_sequence', 0);
            $start = time();
            while (true) {
                $current = Cache::get('documents_events_sequence', 0);
                if ($current !== $last) {
                    $payload = Cache::get('documents_last_event', null);
                    echo "event: documents\n";
                    echo 'data: ' . json_encode([
                        'seq' => (int) $current,
                        'payload' => $payload,
                    ]) . "\n";
                    echo 'id: ' . ((int)$current) . "\n\n";
                    @ob_flush();
                    @flush();
                    $last = $current;
                }

                if ((time() - $start) > 60) {
                    break;
                }

                usleep(250000);
            }
        });

        $response->headers->set('Content-Type', 'text/event-stream');
        $response->headers->set('Cache-Control', 'no-cache');
        $response->headers->set('X-Accel-Buffering', 'no');
        $response->headers->set('Connection', 'keep-alive');

        return $response;
    }
}
