<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Requests\FilterRequest;

use App\Services\ModuleService;
use App\Module;

use Auth;

class ModulesController extends Controller
{

	public function index (Request $request)
	{
		$modules = Module::all();
		$user = Auth::user();
		return $modules->map(function ($module) use ($user) {
			return self::moduleTo($module, $user);
		})->values();
	}

	public function supportedTabs (Request $request, $module, $task)
	{
    if (Module::whereName($module)->count() <= 0) {
			return $this->moduleNotFound($module);
		}
		$moduleService = new ModuleService($module);
		$supportedTabs = $moduleService->supportedTabs($task);
		return response()->json($supportedTabs);
	}

	/**
	 * @param  FilterRequest $request [description]
	 * @return [type]                 [description]
	 */
	public function moduleDatasetsCount (FilterRequest $request, $module)
	{
		$moduleService = new ModuleService($module, $request->input('cads_ids'), $request->input('timespans', []));
		$numberOfDatasets = $moduleService->countDatasets();
		return response()->json($numberOfDatasets);
	}

	public function tasks (FilterRequest $request, $module)
	{
		$moduleService = new ModuleService($module, $request->input('cads_ids'), $request->input('timespans', []));
		$tasks = array_map('App\Http\Controllers\Controller::taskTo', $moduleService->tasks());
		return response()->json($tasks);
	}

	public function taskData (FilterRequest $request, $module, $task)
	{
		$moduleService = new ModuleService($module, $request->input('cads_ids'), $request->input('timespans', []));
		return response()->json($moduleService->summarizedDatasets($task));
	}

	private function moduleNotFound($module)
	{
		return response()->json([
				'success' => false,
				'error' => 'Modul "' . $module . '" wurde nicht gefunden.',
			]);
	}
}
