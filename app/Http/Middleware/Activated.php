<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Support\Facades\Auth;

class Activated
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
            $guard = Auth::getDefaultDriver();

        if (!Auth::guard($guard)->user()->can('use-app'))
            return response()->json([
                'success' => false,
                'error' => 'Sie sind nicht berechtigt PRISMA zu verwenden.'
            ], 403);

        return $next($request);

    }
}
