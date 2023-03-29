<?php

namespace App\Http\Controllers\Auth;

use App\User;
use App\Http\Controllers\Controller;

use Illuminate\Support\Facades\Auth;
use Illuminate\Foundation\Auth\AuthenticatesUsers;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    /*
    |--------------------------------------------------------------------------
    | Registration & Login Controller
    |--------------------------------------------------------------------------
    |
    | This controller handles the registration of new users, as well as the
    | authentication of existing users. By default, this controller uses
    | a simple trait to add these behaviors. Why don't you explore it?
    |
    */

    use AuthenticatesUsers;

    /**
     * Where to redirect users after login / registration.
     *
     * @var string
     */
    protected $redirectTo = '/';

    /**
     * Attempt to log the user into the application.
     * Overrides AuthenicatesUsers@attemptLogin
     * Uses now more than one guard.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return bool
     */
    public function attemptLogin(Request $request)
    {
        foreach (config('auth.guard-chain') as $guard) {
            if (Auth::guard($guard)->attempt($this->credentials($request), $request->has('remember'))) {
                // we have to set $guard to the default driver
                Auth::setDefaultDriver($guard);
                return true;
            }
        }
        return false;
    }

    /**
     * Defines the response if the login succeed.
     * Overrides AuthenticatesUsers@authenticated.
     *
     * @param  \Illuminate\Http\Request $request
     * @param  App\User  $user
     * @return \Illuminate\Http\Response json-Response with user ticket.
     */
    protected function authenticated(Request $request, $user)
    {
        return response()->json([
            'user_ticket' => $user->user_ticket,
        ]);
    }

    /**
     * Get the failed login response instance.
     *
     * @param \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    protected function sendFailedLoginResponse(Request $request)
    {
        return response()->json([
            'success' => false,
            'message' => 'invalid credentials'
        ], 401);
    }

    /**
     * Returns true if the user is logged in.
     * @param  Request $request [description]
     * @return json response
     */
    public function loginTest (Request $request)
    {
        return response()->json([
            'success' => true,
            'info' => 'Sie sind eingeloggt und berechtigt PRISMA zu benutzen.',
        ]);
    }

    /**
     * The model property, that holds the name of the login user.
     * @return string
     * @override
     */
    public function username ()
    {
        return 'login';
    }
}
