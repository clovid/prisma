<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateModuleUserTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('module_user', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('module_id')->unsigned();
            $table->integer('user_id')->unsigned();
            $table->timestamps();

            $table->foreign('module_id')
                  ->references('id')->on('modules')
                  ->onDelete('cascade');

            $table->foreign('user_id')
                  ->references('id')->on('users')
                  ->onDelete('cascade');

            $table->unique(['module_id', 'user_id'], 'module_user_unique');
        });

        $medforgeModule = DB::table('modules')->where('name', 'medforge')->first();
        if (empty($medforgeModule)) {
            return;
        }
        $userIds = DB::table('users')->where('is_admin', true)->pluck('id')->values();
        foreach ($userIds as $userId) {
          DB::table('module_user')->insert(['module_id' => $medforgeModule->id, 'user_id' => $userId]);
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('module_user', function (Blueprint $table) {
            $table->dropForeign(['module_id']);
            $table->dropForeign(['user_id']);
            $table->dropUnique('module_user_unique');
        });
    }
}
