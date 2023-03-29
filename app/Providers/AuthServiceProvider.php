<?php

namespace App\Providers;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

use App\Services\Auth\CadsGuard;
use App\Services\Auth\CadsUserProvider;
use App\Services\Auth\CadsService;
use App\Services\Auth\LocalGuard;

class AuthServiceProvider extends ServiceProvider
{
    /**
     * The policy mappings for the application.
     *
     * @var array
     */
    protected $policies = [
        'App\User' => 'App\Policies\UserPolicy',
    ];

    /**
     * Register any application authentication / authorization services.
     *
     * @return void
     */
    public function boot()
    {
        $this->registerPolicies();

        Gate::define('use-app', function ($user) {
            return $user->active;
        });

        Gate::define('view-module', function ($user, $module) {
            return $user->is_admin || $module->users()->where('user_id', $user->id)->exists();
        });

        // Defines the 'cads' provider
        Auth::provider('cads', function($app, array $config) {
            return new CadsUserProvider($app['hash'], $config['model']);
        });

        // Defines the 'cads' guard
        Auth::extend('cads', function ($app, $name, array $config) {
            return new CadsGuard(Auth::createUserProvider($config['provider']), new CadsService());
        });

        // Defines the 'local' guard
        Auth::extend('local', function ($app, $name, array $config) {
            return new LocalGuard(Auth::createUserProvider($config['provider']));
        });
    }
}
