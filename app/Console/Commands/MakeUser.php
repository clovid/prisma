<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Hash;

use App\User;
use App\Services\UserService;

class MakeUser extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'make:user
                            {login : unique login name of the user}
                            {password : password of the user}
                            {--f|firstname=}
                            {--l|lastname=}
                            {--admin : if the user should get admin rights}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Creates a new user.';

    /**
     * Create a new command instance.
     *
     * @return void
     */
    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     *
     * @return mixed
     */
    public function handle()
    {
        $login = strtolower($this->argument('login'));

        if (!is_null(User::whereLogin($login)->first())) {
            return $this->error('Login already taken, use another one.');
        }

        $attributes = [
            'login' => $this->argument('login'),
            'password' => $this->argument('password'),
            'firstname' => $this->option('firstname'),
            'lastname' => $this->option('lastname'),
            'active' => true,
            'is_admin' => $this->option('admin'),
        ];

        $user = UserService::store($attributes);

        return $this->info('User was created.');
    }
}
