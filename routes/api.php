<?php

use Illuminate\Http\Request;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::group(['middleware' => ['auth', 'active']], function () {
	// Returns the leaves for a given level
	Route::get('accounts/{level?}', 'ApiController@accountsForLevel');
	Route::get('account-leaves/{level}', 'ApiController@leavesForLevel');
});

Route::group(['prefix' => 'vquest-dummy-api'], function () {
	Route::get('', 'VQuestDummyAPI@version');
	Route::get('tests', 'VQuestDummyAPI@tests');
	Route::get('tests/count-datasets', 'VQuestDummyAPI@testsCountDatasets');
	Route::get('tests/{id}', 'VQuestDummyAPI@test');
	Route::get('tests/{id}/answers', 'VQuestDummyAPI@testAnswers');
	Route::get('tests/{id}/count-datasets', 'VQuestDummyAPI@testCountDatasets');
	Route::get('images/{id}', 'VQuestDummyAPI@image');
	Route::get('lists/{id}', 'VQuestDummyAPI@aList');
});

Route::group(['prefix' => 'vquest-dummy-api/v2'], function () {
	Route::get('', 'VQuestDummyAPIv2@version');
	Route::get('tests', 'VQuestDummyAPIv2@tests');
	Route::get('tests/count-datasets', 'VQuestDummyAPIv2@testsCountDatasets');
	Route::get('tests/{id}', 'VQuestDummyAPIv2@test');
	Route::get('tests/{id}/answers', 'VQuestDummyAPIv2@testAnswers');
	Route::get('tests/{id}/count-datasets', 'VQuestDummyAPIv2@testCountDatasets');
	Route::get('images/{id}', 'VQuestDummyAPIv2@image');
	Route::get('images/{id}/slices/{slice}', 'VQuestDummyAPIv2@imageSlice');
	Route::get('overlays/{id}', 'VQuestDummyAPIv2@overlay');
	Route::get('overlays/{id}/slices/{slice}', 'VQuestDummyAPIv2@overlaySlice');
	Route::get('lists/{id}', 'VQuestDummyAPIv2@aList');
});

Route::group(['prefix' => 'vquest-dummy-api/v3'], function () {
	Route::get('', 'VQuestDummyAPIv3@version');
	Route::get('tests', 'VQuestDummyAPIv3@tests');
	Route::get('tests/count-datasets', 'VQuestDummyAPIv3@testsCountDatasets');
	Route::get('tests/{id}', 'VQuestDummyAPIv3@test');
	Route::get('tests/{id}/answers', 'VQuestDummyAPIv3@testAnswers');
	Route::get('tests/{id}/count-datasets', 'VQuestDummyAPIv3@testCountDatasets');
	Route::get('images/{id}', 'VQuestDummyAPIv2@image');
	Route::get('overlays/{id}', 'VQuestDummyAPIv2@overlay');
	Route::get('lists/{id}', 'VQuestDummyAPIv2@aList');
});

Route::group(['prefix' => 'campus-dummy-api'], function () {
	Route::get('cases', 'CampusDummyAPI@tests');
	Route::get('cases/count-datasets', 'CampusDummyAPI@testsCountDatasets');
	Route::get('cases/{id}', 'CampusDummyAPI@test');
	Route::get('cases/{id}/answers', 'CampusDummyAPI@testAnswers');
	Route::get('cases/{id}/count-datasets', 'CampusDummyAPI@testCountDatasets');
});
