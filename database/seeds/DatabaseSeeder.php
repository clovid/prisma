<?php

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $defaultModules = collect([
            ['name' => 'medforge', 'icon' => 'healing', 'active' => false],
            ['name' => 'vquest', 'icon' => 'visibility', 'active' => false],
            ['name' => 'vquest-online', 'icon' => 'preview', 'active' => false],
            ['name' => 'campus', 'icon' => 'assignment_ind', 'active' => false],
        ]);

        $defaultModules->each(function ($module) { App\Module::create($module); });

        $this->addDefaultUsers();
    }

    private function addDefaultUsers()
    {
        $inactiveUser = App\User::create([
            'login' => 'user1',
            'cads_id' => null,
            'active' => false,
            'password' => Hash::make('secret'),
        ]);

        $activeUser = App\User::create([
            'login' => 'user2',
            'cads_id' => null,
            'active' => true,
            'password' => Hash::make('secret'),
        ]);

        $activeUser = App\User::create([
            'login' => 'admin',
            'cads_id' => null,
            'active' => true,
            'is_admin' => true,
            'password' => Hash::make('secret'),
        ]);

        $admin = App\User::create([
            'login' => 'dummy',
            'cads_id' => 1589183,
            'active' => true,
            'is_admin' => true,
        ]);
    }
}
