<?php

namespace App\Services;

use Log;

/**
* @author Friedrich Pawelka <friedrich.pawelka@googlemail.com>
*
* Decides which data should be aggregated by the modules aggregation service
* and sorts the aggregated data into the configured collections.
*/
class CollectionService
{

	/**
	 * Name of the module, for that the collection service should collect data
	 * @var string
	 */
	protected $module;

	/**
	 * Request Service, mapper for GuzzleHttp Client.
	 * @var App\Services\RequestService
	 */
	protected $client;

	/**
	 * Holds the modules tab config.
	 * @var array
	 */
	protected $tabConfig;

	/**
	 * Holds the filter parameter for the api requests
	 * @var array
	 */
	protected $filterParameter;

	/**
	 * Holds the modules config for the aggregation service
	 * @var array
	 */
	protected $moduleAggregationService;

	function __construct($module, $client, $filterParameter)
	{
		$this->module = $module;
		$this->filterParameter = $filterParameter;
		$this->client = $client;
		$this->tabConfig = config('modules.' . $module . '.tab-config');
		$this->moduleAggregationService = config('modules.' . $this->module . '.aggregation-service');
	}

	public function collectTabs ($taskId)
	{
		$tabService = config('modules.' . $this->module . '.tab-service');
		if ($tabService['type'] === 'static')
			return $tabService['value'];
		$handler = new $tabService['value']($this->client);
		return $handler->collectTabs($taskId);
	}

	/**
	 * Main method for coordination of the aggreation job
	 * @todo support single tabs
	 *
	 * @param  int $taskId
	 * @param  string|null $tab    name of tab, optional
	 * @return array
	 */
	public function collectData ($taskId, $tab = null)
	{
		// Get all elements from tabConfig (if available)
		$elements = $this->collectElements($this->tabConfig, []);

		// Post element to module aggregation service
		$aggregatedElements = collect($this->moduleAggregationHandler($taskId, $elements));

		// Put it into tab structure
		$tabStructure = $this->addAggregatedElements($this->tabConfig, $aggregatedElements);

		return $tabStructure;
	}

	/**
	 * Collects the real elements from the tab config.
	 * @param  array $tree
	 * @param  array $carry bag to collect elements
	 * @return array
	 */
	private function collectElements ($tree, $carry)
	{
		foreach ($tree as $nodeName => $nodeContent) {
			if (is_array($nodeContent) && !isset($nodeContent['source']))
				$carry = $this->collectElements($nodeContent, $carry);
			else
				$carry[$nodeName] = $nodeContent;
		}
		return $carry;
	}

	/**
	 * Acts as an adapter for the modules aggregation logic. Sends the elements to the module and process the response.
	 * @param  indt $taskId
	 * @param  array $elements
	 * @return array
	 */
	private function moduleAggregationHandler ($taskId, $elements)
	{
		if ($this->moduleAggregationService['type'] === 'url'){
			$body = array_merge(['elements' => $elements, 'task_ids' => [$taskId]], $this->filterParameter);
			$result = $this->client->postJson($this->moduleAggregationService['value'], [], $body);
		}
		else {
			$handler = new $this->moduleAggregationService['value']($this->client);
			$result = $handler->aggregate([$taskId], $elements, $this->filterParameter);
		}

		if (isset($result['warnings'])) {
			foreach ($result['warnings'] as $warning) {
				Log::warning('Warning with modules aggregation handling.',  ['module' => $this->module, 'warning' => $warning]);
			}
		}

		if (isset($result['errors'])) {
			foreach ($result['errors'] as $error) {
				Log::error('Error with modules aggregation handling.',  ['module' => $this->module, 'error' => $error]);
			}
		}

		if (!isset($result['elements']) || !is_array($result['elements']) || count($result['elements']) === 0) {
			Log::error('Fatal error with modules aggregation handling. No elements where aggregated!', ['module' => $this->module]);
			return;
		}

		return $this->cleanElements($result['elements']);
	}

	/**
	 * Sorts the retrieved aggregated elements into the tab structure
	 * @param array $tree
	 * @param array $elements
	 * @return array
	 */
	private function addAggregatedElements ($tree, $elements)
	{
		if (empty($tree))
			return $elements;

		$result = [];
		foreach ($tree as $nodeName => $nodeContent) {
			if (is_array($nodeContent) && !isset($nodeContent['source']))
				$result[$nodeName] = $this->addAggregatedElements($nodeContent, $elements);
			else {
				$aggregatedElement = $elements->pull($nodeName);
				if (is_null($aggregatedElement))
					Log::warning('Could not add aggregated element for ' . $nodeName . ': it does not exists!', ['module' => $this->module]);
				$result[$nodeName] = $aggregatedElement;
			}
		}
		return $result;
	}

	private function cleanElements ($elements)
	{
		// remove NULL > NULL in grouped frequency distribution
		$elements = $this->cleanGroupedFrequencyDistribution($elements);

		return $elements;
	}

	private function cleanGroupedFrequencyDistribution ($elements)
	{
		foreach ($elements as $key => $value) {
			if (!is_array($value))
				continue;
			if (!isset($value['title'])) {
				$elements[$key] = $this->cleanGroupedFrequencyDistribution($value);
				continue;
			}
			if (isset($value['hierarchy']))
				$elements[$key] = $this->cleanGroupedFrequencyDistributionHelper($value);
		}
		return $elements;
	}

	private function cleanGroupedFrequencyDistributionHelper ($element)
	{
		$validAttributes = [];
		foreach ($element['attributes'] as $key => $attribute) {
			$trimmedAttribute = $this->trimNullAttributes($attribute);
			if (!is_null($trimmedAttribute))
				$validAttributes[] = $trimmedAttribute;
		}
		$element['attributes'] = $validAttributes;
		return $element;
	}

	private function trimNullAttributes ($attribute)
	{
		if (!isset($attribute['children'])) {
			if ($attribute['value'] === $this->moduleAggregationService['null-string'])
				return;
			return $attribute;
		}

		$validChildren = [];
		foreach ($attribute['children'] as $child) {
			$trimmedChild = $this->trimNullAttributes($child);
			if (!is_null($trimmedChild))
				$validChildren[] = $trimmedChild;
		}
		$attribute['children'] = $validChildren;

		if (!empty($attribute['children']))
			return $attribute;
		else {
			unset($attribute['children']);
			if ($attribute['value'] === $this->moduleAggregationService['null-string'])
				return;
			return $attribute;
		}
	}
}
