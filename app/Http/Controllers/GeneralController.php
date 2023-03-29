<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use WhichBrowser\Parser;
use App\Module;

class GeneralController extends Controller
{

	public function index(Request $request)
	{
		$client = new Parser($request->header('user-agent'));
		$browserName = empty($client->browser->getName()) ? 'Unbekannt' : $client->browser->getName();
		$browserIsValid = in_array($browserName, config('app.supported-browsers'));
		if (!$browserIsValid) {
			return view('errors.406', [
				'browserName' => $browserName,
				'supportedBrowsers' => config('app.supported-browsers'),
			]);
		}

		$modules = Module::all()->map(function ($module) {
			return config('modules.' . $module->name);
		});

		return view('index', ['modules' => $modules]);
	}

	public function config (Request $request)
	{
		$config = [
			'privacy' => config('privacy'),
		];
		$user = \Auth::user();
		if (!empty($user)) {
			$config['user'] = $user->config;
		}
		return response()->json($config);
	}
}
