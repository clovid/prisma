<?php

namespace App\Services;

use Log;
use Cache;

/**
* @author Friedrich Pawelka <friedrich.pawelka@googlemail.com>
*
* Collects the tabs from campus
*/
class CampusTabCollector
{
	protected $module = 'campus';

	/**
	 * Request Service, mapper for GuzzleHttp Client.
	 * @var App\Services\RequestService
	 */
	protected $client;

	/**
	 * Base url of the module API
	 * @var string
	 */
	protected $baseUrl;

	/**
	 * Array of different routes for the communication with the campus API
	 * @var array
	 */
	protected $api;

	public function __construct ($client = null)
	{
		if (is_null($client))
			$this->client = new RequestService($this->module);
		else
			$this->client = $client;
		$this->baseUrl = $this->client->baseUrl;
		$this->api = [
			'test' => 'cases/{id}',
		];
	}

	public function collectTabs ($testId)
	{
		// get test
		$route = str_replace('{id}', $testId, $this->api['test']);
		$test = $this->client->getJson($route);
		if (is_null($test) || !isset($test['groups']))
			return;
		$tabTemplate = config('modules.' . $this->module . '.tab-service.default-tab-template');
		$tabIndex = 0;

		return array_map(function ($group) use ($tabTemplate, &$tabIndex) {
			$tabName = camel_case(str_slug($group['name']));
			$tabTitle = config('modules.' . $this->module . '.tab-titles.' . $group['name'], null);
			if (empty($tabTitle)) {
				$tabTitle = config('modules.' . $this->module . '.default-tab-title', 'tab') . ' ' . ($tabIndex + 1);
			}
			$tabIndex++;
			return [
				'template' => $tabTemplate,
				'name' => $tabName,
				'title' => $tabTitle,
			];
		}, $test['groups']);
	}
}
