<?php

namespace App\Services;

use GuzzleHttp\Client;
use Log;
use Auth;

/**
 * @author Friedrich Pawelka <friedrich.pawelka@googlemail.com>
 */

class ModuleService
{

	/**
	 * Name of the module, for that the filter service is used
	 * @var string
	 */
	protected $module;

	/**
	 * Array of different routes for the communication with the modules API
	 * @var array {count-datasets, tasks}
	 */
	protected $api;

	/**
	 * Array of different filter names for the communication with the modules API
	 * Some modules expect other filter parameter names.
	 * @var array {cads_ids, timespans}
	 */
	protected $filterNames;

	/**
	 * Filter parameter with cads_ids and timestamps (or other filter names, see $filterNames)
	 * cads_ids: array
	 * timestamps: array of [from, to], time in milliseconds.
	 * @var array
	 */
	protected $filterParameter;

	/**
	 * Request Service, mapper for GuzzleHttp Client.
	 * @var App\Services\RequestService
	 */
	public $client;

	/**
	 * Collection Service, adapter for the modules aggregation service
	 * @var App\Services\AggregationService
	 */
	protected $collector;

	function __construct($module, $cadsIds = null, $timespans = [])
	{

		$this->module = $module;

		$this->api = [
			'tasks' => config('modules.' . $this->module . '.routes.tasks'),
			'tasks-count-datasets' => config('modules.' . $this->module . '.routes.tasks-count-datasets'),
			'task-count-datasets' => config('modules.' . $this->module . '.routes.task-count-datasets'),
		];

		$this->filterNames = [
			'cads_ids' => config('modules.' . $this->module . '.filter.cads_ids', 'cads_ids'),
			'timespans' => config('modules.' . $this->module . '.filter.timespans', 'timespans'),
		];

		$this->filterParameter = $this->constructFilterParameter($this->prepareCadsIds($cadsIds), $this->prepareTimespans($timespans));

		$this->client = new RequestService($module);
		$this->collector = new CollectionService($module, $this->client, $this->filterParameter);
	}

	public function supportedTabs ($taskId)
	{
		return $this->collector->collectTabs($taskId);
	}

	/**
	 * Count all datasets. When no task id is provided it is counted for all tasks.
	 * @param  int $taskId optional
	 * @return int
	 */
	public function countDatasets ($taskId = null)
	{
		if (is_null($taskId))
			$route = $this->api['tasks-count-datasets'];
		else
			$route = str_replace('{id}', $taskId, $this->api['task-count-datasets']);

		try {
			$countRequest = $this->requestJson($route);
		} catch (\GuzzleHttp\Exception\ConnectException $e) {
			\Log::error('Couldn\'t countDatasets, because connection to module ' . $this->module . ' failed.', ['message' => $e->getMessage()]);
			$countRequest = ['number_of_datasets' => 0];
		} catch (\GuzzleHttp\Exception\RequestException $e) {
			\Log::error('Couldn\'t countDatasets, because request ' . $route . ' to module ' . $this->module . ' failed.', ['message' => $e->getMessage()]);
			$countRequest = ['number_of_datasets' => 0];
		}

		return $countRequest['number_of_datasets'];
	}

	/**
	 * Returns an arry of tasks including number of datasets
	 * @return array
	 */
	public function tasks ()
	{
		$route = $this->api['tasks'];
		// $tasks = $this->requestJson($route);
		// TODO: remove, when all services provide id as string
		$tasks = array_map(
			function ($task) {
				$task['id'] = strval($task['id']);
				return $task;
			},
			$this->requestJson($route)
		);
		return $tasks;
	}

	/**
	 * Returns a summary of all datasets regarding the given taskId
	 * @param  int $taskId
	 * @param  string $tabName optional
	 * @return array
	 */
	public function summarizedDatasets ($taskId)
	{
		$numberOfDatasets = $this->countDatasets($taskId);
		if ($numberOfDatasets > 0 && $numberOfDatasets < config('privacy.minimum_task_datasets')) {
				$user = Auth::user();
				if (empty($user)) {
					$login = 'CLI';
					$userId = '0';
				} else {
					$login = $user->login;
					$userId = $user->id;
				}
				Log::warning('privacy_breach::minimum_task_datasets', ['responsible' => ['login' => $login, 'id' => $userId], 'task' => $taskId]);
		}
		$summarizedData = $this->collector->collectData($taskId);
		return $summarizedData;
	}

	private function requestJson($url)
	{
		return $this->client->getJson($url, $this->filterParameter);
	}

	private function prepareCadsIds ($cadsIds)
	{
		if (is_null($cadsIds))
			$cadsIds = [];
		else
			$cadsIds = explode(',', $cadsIds);
		return $cadsIds;
	}

	private function prepareTimespans ($timespans)
	{
		$timespans = array_map(function ($timespan) {
			return explode(',', $timespan);
		}, $timespans);
		return array_filter($timespans, function ($timespan) {
			$timestamps = array_filter($timespan, function ($timestamp) {
				return is_numeric($timestamp);
			});
			return count($timestamps) === 2;
		});
	}

	private function constructFilterParameter($cadsIds, $timespans, $timeInSeconds = true)
	{
		$filter = [];

		if (count($cadsIds) > 0) {
			$filter[$this->filterNames['cads_ids']] = implode(',', $cadsIds);
			if (count($cadsIds) < config('privacy.minimum_users_filter')) {
				$user = Auth::user();
				Log::warning('privacy_breach::minimum_users_filter', ['responsible' => ['login' => $user->login, 'id' => $user->id], 'cads_ids' => $filter[$this->filterNames['cads_ids']]]);
			}
		}

		if (count($timespans) > 0) {
			if ($timeInSeconds)
				$timespans = array_map(function ($timespan) {
					return [
						round($timespan[0] / 1000),
						round($timespan[1] / 1000),
					];
				}, $timespans);

			$filter[$this->filterNames['timespans']] = array_map(function ($timespan) {
				return implode(',', $timespan);
			}, $timespans);
		}

		return $filter;
	}
}
