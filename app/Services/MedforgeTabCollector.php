<?php

namespace App\Services;

use Log;
use Cache;

/**
* @author Friedrich Pawelka <friedrich.pawelka@googlemail.com>
*
* Collects the tabs from medforge
*/
class MedforgeTabCollector
{
	protected $module = 'medforge';

	/**
	 * Request Service, mapper for GuzzleHttp Client.
	 * @var App\Services\RequestService
	 */
	protected $client;

	/**
	 * Array of different routes for the communication with the campus API
	 * @var array
	 */
	protected $api;

	public function __construct ($client = null)
	{
		if (is_null($client)) {
			$this->client = new RequestService($this->module);
		}	else {
			$this->client = $client;
		}
		$this->api = [
			'tabs' => 'tasks/{id}/forms',
		];
	}

	public function collectTabs ($taskId)
	{
		$defaultTargetTabs = config('modules.' . $this->module . '.tab-service.tab-structure');

		$route = str_replace('{id}', $taskId, $this->api['tabs']);
		try {
			$availableSourceTabs = $this->client->getJson($route);
		} catch (\Throwable $th) {
			Log::error($th->getMessage());
			return $defaultTargetTabs;
		}
		if (empty($availableSourceTabs)) {
			return $defaultTargetTabs;
		}
		$availableSourceTabNames = collect($availableSourceTabs)
			->pluck('name')
			->values()
			->all();

		$targetToSourceTabMap = collect(config('modules.' . $this->module . '.tab-config'))
			->map(function ($item, $key) use ($availableSourceTabNames) {
				$sourceTabs = collect($this->extractSourcesFromField($item))
					->map(function ($source) { return $this->extractSourceTabFromSource($source); })
					->unique()
					->filter(function ($sourceTab) use ($availableSourceTabNames) {
						return in_array($sourceTab, $availableSourceTabNames);
					});
				return [
					'targetTab' => $key,
					'sourceTabs' => $sourceTabs,
				];
			})
			->filter(function ($tabMap) {
				return $tabMap['sourceTabs']->count() > 0;
			})
			->values();

		$sortedTargetTabs = $targetToSourceTabMap
			->sortBy(function ($tabMap) use ($availableSourceTabNames) {
				return collect($tabMap['sourceTabs'])
					->map(function ($sourceTab) use ($availableSourceTabNames) {
						return array_search($sourceTab, $availableSourceTabNames, true);
					})
					->min();
			})
			->values();

		$neededTargetTabs = $sortedTargetTabs->pluck('targetTab')->all();

		return collect($defaultTargetTabs)
			->whereIn('name', $neededTargetTabs)
			->sortBy(function ($tab) use ($neededTargetTabs) {
				return array_search($tab['name'], $neededTargetTabs, true);
			})
			->values()
			->all();
	}

	private function extractSourcesFromField($field) {
		if (!is_array($field)) {
			return [$field];
		}
		if (isset($field['source'])) {
			return $this->extractSourcesFromField($field['source']);
		}
		$sources = [];
		foreach ($field as $key => $value) {
			$sources = array_merge($sources, $this->extractSourcesFromField($value));
		}
		return $sources;
	}

	private function extractSourceTabFromSource($source) {
		return explode('.', $source)[0];
	}
}
