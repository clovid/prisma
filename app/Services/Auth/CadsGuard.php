<?php

namespace App\Services\Auth;

use Illuminate\Http\Request;

use Illuminate\Contracts\Auth\Guard;
use Illuminate\Contracts\Auth\UserProvider;
use Illuminate\Contracts\Auth\Authenticatable as UserContract;
use Illuminate\Auth\GuardHelpers;

use Carbon\Carbon;
use Log;

/**
 * @author Friedrich Pawelka <friedrich.pawelka@googlemail.com>
 * @see Illuminate\Auth\TokenGuard
 * @see Illuminate\Auth\SessionGuard
 */
class CadsGuard implements Guard {

    use GuardHelpers;

    /**
     * A provider to handle CADS user tickets
     */
    protected $cadsService;

    /**
     * Create a new authentication guard.
     *
     * @param  \Illuminate\Contracts\Auth\UserProvider  $provider
     * @param  \Illuminate\Http\Request  $request
     * @return void
     */
    public function __construct(UserProvider $provider, CadsService $cadsService)
    {
        $this->provider = $provider;
        $this->cadsService = $cadsService;
    }

    /**
     * Get the currently authenticated user.
     *
     * @return \Illuminate\Contracts\Auth\Authenticatable|null
     */
    public function user()
    {
        // If we've already retrieved the user for the current request we can just
        // return it back immediately. We do not want to fetch the user data on
        // every call to this method because that would be tremendously slow.
        if (! is_null($this->user)) {
            return $this->user;
        }

        $user = null;

        $ticket = $this->cadsService->getTicket();

        if (!empty($ticket)) {
            // User with this ticket exists?
            // NOTE: we only compare the user ticket here, because it is comming from CADS
            // and we assume, that we do not get duplicate tickets from them
            $user = $this->provider->retrieveByCredentials(['user_ticket' => $ticket]);

            // User exists and ticket isn't valid?
            // We also check, if password is empty, because otherwise the user would be
            // a local one.
            if (!is_null($user) && empty($user->password) && !$this->cadsService->validateTicket($ticket)) {
                $this->provider->updateRememberToken($user, null);
                $user = null;
            }
        }

        return $this->user = $user;
    }

    /**
     * Attempt to authenticate a user using CADS credentials.
     *
     * @param  array  $credentials
     * @param  bool   $remember
     * @param  bool   $login
     * @return bool
     */
    public function attempt(array $credentials = [], $remember = null, $login = true)
    {
        // Default remember. Otherwise the user ticket won't be persisted in the user
        $remember = true;

        // Prepare credentials
        $credentials['login'] = mb_strtolower($credentials['login']);

        // If an attempt to login at cads succeed, than we can got further.
        $ticket = $this->cadsService->attempt($credentials, $remember);
        if ($ticket === false)
            return false;

        // Get user information including CADS ID
        $userInformation = $this->cadsService->user($ticket);
        $cadsId = $userInformation['cads_id'];

        if (empty($cadsId)) {
            Log::error('Found no CADS-ID even if ticket is valid. Maybe not in akzento?', ['login' => $credentials['login']]);
            return false;
        }

        // Check if user with this cads_id already exists
        $user = $this->provider->retrieveByCredentials(['cads_id' => $cadsId]);

        if (is_null($user)) {
           // Create user
            $user = $this->provider->createModel();
            $user->login = $credentials['login'];
            $user->updateInformation($userInformation);
        }

        if ($login)
            // set ticket
            $this->provider->updateRememberToken($user, $ticket);

        // Update user information at least every week
        if ($user->updated_at->diffInDays(Carbon::now()) > 7)
            $user->updateInformation($userInformation);

        return true;
    }

    /**
     * Validate a user's credentials.
     *
     * @param  array  $credentials
     * @return bool
     */
    public function validate(array $credentials = [])
    {
        return $this->attempt($credentials, false, false);
    }

    /**
     * Log the user out of the application.
     *
     * @return void
     */
    public function logout()
    {
        $user = $this->user();

        if (is_null($user))
            // No user is logged in
            return;

        $this->provider->updateRememberToken($user, null);
        $this->cadsService->invalidateTicket();
        $this->user = null;
    }
}
