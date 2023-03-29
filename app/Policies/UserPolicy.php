<?php

namespace App\Policies;

use App\User;

use Illuminate\Auth\Access\HandlesAuthorization;

/**
 * @author Friedrich Pawelka <friedrich.pawelka@googlemail.com>
 */
class UserPolicy
{
    use HandlesAuthorization;

    public function index(User $currentUser)
    {
        return $currentUser->is_admin;
    }

    public function store(User $currentUser)
    {
        return $currentUser->is_admin;
    }

    public function update(User $currentUser, User $user)
    {
        return $currentUser->is_admin;
    }

    public function destroy(User $currentUser, User $user)
    {
        return $currentUser->is_admin;
    }
}
