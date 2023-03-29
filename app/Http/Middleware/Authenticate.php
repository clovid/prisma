<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\Auth;

class Authenticate
{
    /**
     * Handle an incoming request.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure  $next
     * @param  string|null  $guard
     * @return mixed
     */
    public function handle($request, Closure $next, $guard = null)
    {
        if (is_null($guard))
            $guards = config('auth.guard-chain');
        else
            $guards = [$guard];

        foreach ($guards as $guard) {
            if (Auth::guard($guard)->check()) {
                Auth::setDefaultDriver($guard);
                return $next($request);
            }
        }

        return response()->json([
            'success' => false,
            'error' => 'Sie sind nicht eingeloggt.'
        ], 401);
    }
}
