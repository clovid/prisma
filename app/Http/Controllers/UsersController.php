<?php

namespace App\Http\Controllers;

use Gate;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

use App\Services\UserService;
use App\User;

class UsersController extends Controller
{

    /**
     * Returns information about the current authenticated user
     * @param  Request $request [description]
     * @return [type]           [description]
     */
    public function user(Request $request)
    {
        $user = Auth::user();
        return response()->json([
            'success' => true,
            'user' => self::userTo($user),
        ]);
    }

    public function storeUserConfig(Request $request)
    {
        $user = Auth::user();
        $config = $request->all();
        if (empty($config)) {
            $config = null;
        }
        $user->config = $config;
        $user->save();

        return response()->json($config);
    }

    public function index(Request $request)
    {
        $this->authorize('index', User::class);

        $filter = $this->prepareFilter($request);

        $query = User::with('modules');
        if (isset($filter['name'])) {
            $query->where(function ($query) use ($filter) {
                $query->where('first_name', 'ilike', '%' . $filter['name'] . '%');
                $query->orWhere('last_name', 'ilike', '%' . $filter['name'] . '%');
                $query->orWhere('login', 'ilike', '%' . $filter['name'] . '%');
            });
        }

        if (isset($filter['modules'])) {
            foreach ($filter['modules'] as $moduleId) {
                $query->whereHas('modules', function ($query) use ($moduleId) {
                    $query->where('modules.id', $moduleId);
                });
            }
        }

        $users = $query->get()->map(function (User $user) {
            return static::fullUserTo($user);
        });
        return response()->json([
            'users' => $users,
            'count' => $users->count(),
            'total' => User::count(),
        ]);
    }

    public function store(Request $request)
    {
        $this->authorize('store', User::class);

        $input = $request->all();
        if (isset($input['login'])) {
            $input['login'] = strtolower($input['login']);
        }

        Validator::make($input, [
            'login' => 'required|unique:users',
            'firstname' => 'required',
            'lastname' => 'required',
            'password' => 'required',
        ])->validate();

        if (!isset($input['is_admin'])) {
            $input['is_admin'] = false;
        }

        if (!isset($input['active'])) {
            $input['active'] = true;
        }

        $user = UserService::store($input);

        if (!$user)
            return response()->json([
                'error' => 'Unknown error occurred'
            ], 503);

        return response()->json([
            'user' => static::fullUserTo($user),
        ]);

    }

    public function update(Request $request, User $user)
    {
        $this->authorize('update', $user);

        $user = UserService::update($user, $request->all());

        if (!$user)
            return response()->json([
                'error' => 'Unknown error occurred'
            ], 503);

        return response()->json([
            'user' => static::fullUserTo($user),
        ]);
    }

    public function destroy(Request $request, User $user)
    {
        $this->authorize('destroy', $user);

        $result = UserService::destroy($user);

        if (!$result)
            return response()->json([
                'error' => 'User couldn\'t be destroyed.'
            ], 403);

        return response()->json([
        ], 204);
    }

    public function updateMultiple(Request $request)
    {
        $users = $this->usersFromRequest($request);
        if ($users->isEmpty())
            return response()->json([
                'error' => 'No/Wrong user_ids provided.'
            ], 422);

        $updatedUsers = $users->filter(function ($user) use ($request) {
            if (Gate::allows('update', $user)) {
                $user = UserService::update($user, $request->all());
                return $user;
            }
        });

        return response()->json([
            'user_ids' => $updatedUsers->pluck('id')->all(),
        ]);
    }

    private function prepareFilter(Request $request)
    {
        $filter = [];

        if (!empty($request->input('name', null)))
            $filter['name'] = trim($request->input('name'));

        $modules = $request->input('modules');

        if (!empty($modules) && is_array($modules))
            $filter['modules'] = array_map(function ($moduleId) { return (int) $moduleId; }, $modules);

        return $filter;
    }

    /**
     * If the request has a parameter with comma separated user_ids this method returns all those users.
     * @param  Request $request
     * @return Collection empty|users
     */
    private function usersFromRequest(Request $request)
    {
        if (!$request->has('user_ids'))
            return collect();
        $userIds = $request->input('user_ids');
        if (empty($userIds))
            return collect();
        return User::whereIn('id', $userIds)->get();
    }
}
