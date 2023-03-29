<?php
namespace App\Services;

use Hash;
use App\Module;
use App\User;

/**
 * @author Friedrich Pawelka <friedrich.pawelka@googlemail.com>
 */
class UserService
{

    protected static $emptyUser = [
        'modules' => [],
    ];

    public static function store(array $attributes)
    {
        return User::create([
            'login' => $attributes['login'],
            'password' => Hash::make($attributes['password']),
            'first_name' => $attributes['firstname'],
            'last_name' => $attributes['lastname'],
            'active' => $attributes['active'],
            'is_admin' => $attributes['is_admin'],
        ]);
    }

    public static function update(User $user, array $attributes = [])
    {
        $attributes = array_merge(static::$emptyUser, array_filter($attributes, function ($attribute) { return !is_null($attribute);})); // filter empty values

        $moduleIds = array_map(function ($module) { return $module['id']; }, $attributes['modules']);

        if (isset($attributes['active'])) {
            $user->active = $attributes['active'];
        }

        $user->save();

        $user->modules()->sync($moduleIds);

        return $user;
    }

    public static function destroy(User $user)
    {
        return $user->delete();
    }
}
