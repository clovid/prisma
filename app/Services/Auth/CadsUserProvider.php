<?php

namespace App\Services\Auth;

use Illuminate\Contracts\Auth\Authenticatable as UserContract;
use Illuminate\Auth\EloquentUserProvider;

use App\User;
use Validator;

/**
 * @author Friedrich Pawelka <friedrich.pawelka@googlemail.com>
 */
class CadsUserProvider extends EloquentUserProvider {
    /**
     * Update the user ticket for the given user in storage.
     * Disable timestamps to prevent touching the user timestamp updated_at
     * @param  \Illuminate\Contracts\Auth\Authenticatable  $user
     * @param  string  $ticket
     * @return void
     */
    public function updateRememberToken(UserContract $user, $ticket)
    {
        if (is_null($user))
            return;
        $user->timestamps = false;
        $user->setRememberToken($ticket);
        $user->save();
        $user->timestamps = true;
    }
}