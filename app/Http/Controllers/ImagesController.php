<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\RequestService;

use Auth;
use Cache;

use App\Module;

class ImagesController extends Controller
{
	/**
	 * Returns an image. Checks first, if it exists locally
	 * @param  Request $request [description]
	 * @param  [type]  $id      [description]
	 * @return [type]           [description]
	 */
	public function get (Request $request, $id)
	{
		$validHeaders = [
			'Content-Type' => 'image/png',
			'Cache-Control' => 'max-age=86400',
		];
		// Check if file exists
		$filePath = storage_path(config('files.path-prefix') . $id);
		if (file_exists($filePath))
			return response()->file($filePath, $validHeaders);

		$config = Cache::get($id);
		if (is_null($config) || !is_array($config)) {
			return response()->json(['error' => 'No image found'], 404);
		}

		if (empty($config['module']) || empty($config['url']) || !isset($config['parameter'])) {
			return response()->json(['error' => 'No valid image config found', 'config' => $config], 404);
		}

    if (Module::whereName($config['module'])->count() <= 0) {
			return response()->json(['error' => 'Module for image not activated', 'config' => $config], 404);
		}

		$requestService = new RequestService($config['module']);

		$rawImage = $requestService->getRaw($config['url'], $config['parameter']);
		if (is_null($rawImage))
			return response()->json(['error' => 'No valid response from external service', ['config' => $config]], 500);

		file_put_contents($filePath, $rawImage);
		return response($rawImage)->withHeaders($validHeaders);
	}

	public function getType (Request $request, $id, $type)
	{
		if (!in_array($type, ['raw', 'thumbnail'])) {
			return response()->json(['error' => 'Wrong type provided'], 415);
		}

		$validHeaders = [
			'Content-Type' => 'image/png',
			'Cache-Control' => 'max-age=86400',
		];
		// Check if file exists
		$filePath = storage_path(config('files.path-prefix') . $id . $type);
		if (file_exists($filePath))
			return response()->file($filePath, $validHeaders);

		$config = [
			'module' => 'vquest-online',
			'url' => 'images/' . $id . '/' . $type,
			'parameter' => []
		];

		$requestService = new RequestService($config['module']);

		$rawImage = $requestService->getRaw($config['url'], $config['parameter']);
		if (is_null($rawImage))
			return response()->json(['error' => 'No valid response from external service', ['config' => $config]], 500);

		file_put_contents($filePath, $rawImage);
		return response($rawImage)->withHeaders($validHeaders);
	}
}
