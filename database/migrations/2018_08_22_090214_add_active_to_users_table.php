<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

use App\User;

class AddActiveToUsersTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('active')->default(false);
        });

        $adminUserIds = User::whereIsAdmin(true)->pluck('id')->values();
        DB::table('users')
            ->whereIn('id', $adminUserIds)
            ->update(['active' => true, 'is_admin' => false]);
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        $activeUserIds = User::whereActive(true)->pluck('id')->values();
        DB::table('users')
            ->whereIn('id', $activeUserIds)
            ->update(['is_admin' => true]);

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('active');
        });
    }
}
