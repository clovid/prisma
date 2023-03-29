<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Bus\DispatchesJobs;
use Illuminate\Routing\Controller as BaseController;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

use App\User;
use App\Module;
use Carbon\Carbon;

class Controller extends BaseController
{
    use AuthorizesRequests, DispatchesJobs, ValidatesRequests;

    protected static function moduleTo(Module $module, User $user)
    {
        return [
            'id' => $module->id,
            'name' => $module->name,
            'title' => trans('modules.' . $module->name . '.title'),
            'icon' => $module->icon,
            'active_for_user' => !empty($user) && ($user->is_admin || $user->modules->contains('id', $module->id)),
        ];
    }

    protected static function carbonTo(Carbon $date = null)
    {
        if (is_null($date))
            return null;
        return [
            'timestamp' => $date->timestamp * 1000,
            'timezone' => $date->timezoneName,
        ];
    }

    protected static function userTo (User $user)
    {
        return [
            'id' => $user->id,
            'login' => $user->login,
            'firstname' => $user->first_name,
            'lastname' => $user->last_name,
            'is_admin' => $user->is_admin,
            'active' => $user->active,
            'is_local' => $user->isLocal(), // Only local user have a password
        ];
    }

    protected static function fullUserTo(User $user)
    {
        $userTo = static::userTo($user);
        return array_merge($userTo, [
            'modules' => $user->modules->map(
                function (Module $module) use ($user) {
                    return static::moduleTo($module, $user);
                }
            ),
        ]);
    }

    protected static function taskTo ($task)
    {
        return [
            'id' => $task['id'],
            'title' => $task['title'],
            'numberOfDatasets' => $task['number_of_datasets'],
            'createdAt' => isset($task['created_at']) ? $task['created_at'] : null,
            'updatedAt' => isset($task['updated_at']) ? $task['updated_at'] : null,
        ];
    }
}
