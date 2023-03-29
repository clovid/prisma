<?php

/*
|--------------------------------------------------------------------------
| Application Routes
|--------------------------------------------------------------------------
|
| Here is where you can register all of the routes for an application.
| It's a breeze. Simply tell Laravel the URIs it should respond to
| and give it the controller to call when that URI is requested.
|
*/

// Start route to load angular app
Route::get('/', 'GeneralController@index');

// Authentication
Route::post('login', 'Auth\AuthController@login')->middleware('guest', 'session');
Route::post('logout', 'Auth\AuthController@logout')->middleware('auth', 'session');


Route::group(['middleware' => ['auth', 'active']], function () {
	Route::get('config', 'GeneralController@config');
	Route::get('login-test', 'Auth\AuthController@loginTest');

	Route::group(['prefix' => 'modules'], function () {
		Route::get('', 'ModulesController@index');
		Route::get('{module}/count-datasets', 'ModulesController@moduleDatasetsCount');
		Route::get('{module}/tasks', 'ModulesController@tasks');
		Route::get('{module}/tasks/{task}', 'ModulesController@taskData');
		Route::get('{module}/tasks/{task}/supported-tabs', 'ModulesController@supportedTabs');
	});

	Route::get('images/{id}', 'ImagesController@get')->middleware('etag');
	Route::get('images/{id}/{type}', 'ImagesController@getType')->middleware('etag');

	Route::get('user', 'UsersController@user');
	Route::post('user/config', 'UsersController@storeUserConfig');
	Route::group(['prefix' => 'users'], function () {
			Route::get('', 'UsersController@index');
			Route::post('', 'UsersController@store');
			Route::put('', 'UsersController@updateMultiple'); // Paramter: user_ids=1,2,3
			Route::put('{user}', 'UsersController@update')->where('user', '[0-9]+');
			Route::delete('{user}', 'UsersController@destroy')->where('user', '[0-9]+');
	});

});