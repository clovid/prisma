<?php

namespace App\Services;

use Log;
use Cache;
use InvalidArgumentException;
use Illuminate\Support\Str;

/**
* @author Friedrich Pawelka <friedrich.pawelka@googlemail.com>
*
* Aggregates the data from vquest online
*/
class VQuestOnlineAggregator
{
	protected $module = 'vquest-online';

	/**
	 * Filter for the answers
	 * @var array [user_ids, timespans]
	 */
	protected $filter;

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
	 * Array of different routes for the communication with the vquest API
	 * @var array [tests]
	 */
	protected $api;

	/**
	 * Collector for tab images;
	 * @var array
	 */
	protected $images = [];

	/**
	 * Strings that are used as preposition to provide additional information
	 * about a question or subquestion.
	 * @var [type]
	 */
	protected $labelPrepositions = [
		'title' => '$_PRISMA-Titel:', // if set, than the question will be grouped with the string behind the ':'
		'overlay' => '$_overlay:', // if set, the question will get an image with an overlay. (IMAGE_ID:OVERLAY_ID),
		'pre' => '$_PRISMA-Pre:', // if set, a pre element will be shown (only 'heading' at the moment),
		'subquestions' => '$_PRISMA-Subq', // if set, the following label will be for the Xth subquestion (e.g. $_PRISMA-Subq0Label) will add "Label" to first subquestion
		'subquestion-title' => '$_PRISMA-SubqTitle:', // e.g. "$_PRISMA-Subq0Title:Test" will add the title "Test" to the first subquestion
		'subquestion-link' => '$_PRISMA-SubqLink:', // e.g. ""$_PRISMA-Subq0Link:1" will link the first question (open) with the second question (marker)
	];

	public function __construct ($client = null)
	{
		if (is_null($client))
			$this->client = new RequestService($this->module);
		else
			$this->client = $client;

		$this->baseUrl = $this->client->baseUrl;
		$this->api = [
			'tests' => 'tests',
			'test' => 'tests/{id}',
			'test-answers' => 'tests/{id}/answers',
			'image' => 'images/{id}',
			'list' => 'lists/{id}',
			'overlay' => 'overlays/{id}',
			'slice' => 'slices/{number}',
			'token' => 'token',
		];
	}

	public function collectTabs ($testId)
	{
		// get test
		$test = $this->getStaticResource('test', $testId);
		if (is_null($test) || !isset($test['groups']))
			return;
		$tabTemplate = config('modules.' . $this->module . '.tab-service.default-tab-template');

		return array_map(function ($group) use ($tabTemplate) {
			return [
				'template' => $tabTemplate,
				'name' => camel_case(Str::slug($group['name'])),
				'title' => $group['name'],
			];
		}, $test['groups']);
	}

	public function aggregate ($testIds, $elements, $filter)
	{
		$this->filter = $filter;

		// Get structure from tests for the filter and tests
		$groups = [];
		foreach ($testIds as $testId) {
			$testGroups = $this->getGroups($testId);
			foreach ($testGroups as $group) {
				if (!isset($groups[$group['name']]))
					$groups[$group['name']] = $group['questions'];
				else
					$groups[$group['name']] = array_merge($groups[$group['name']], $group['questions']);
			}
		}
		$answers = $this->getAnsweredSubquestions($testIds);

		// Generate the result which contains all subquestions including
		$tabs = [];
		foreach ($groups as $groupTitle => $questions) {
			$groupName = camel_case(Str::slug($groupTitle));
			$tabs[$groupName] = $this->generateTabContent($questions, $answers, $groupTitle);
		}

		return [
			'success' => true,
			'elements' => $tabs,
		];
	}

	/**
	 * Returns the groups of a given test id
	 * @param  int $testId
	 * @return array
	 */
	private function getGroups ($testId)
	{
		$test = $this->getStaticResource('test', $testId);
		if (is_null($test) || !isset($test['groups']))
			return;
		return $test['groups'];
	}

	/**
	 * Returns all subquestions for a given set of test ids
	 * @param  array $testIds
	 * @return Illuminate\Support\Collection
	 */
	private function getAnsweredSubquestions ($testIds)
	{
		$answeredSubquestions = collect();
		foreach ($testIds as $testId) {
			$answers = $this->getAnswers($testId);
			if (is_null($answers))
				continue;
			$subquestions = array_reduce($answers, function ($carry, $question) {
				if (!isset($question['subquestions']))
					return $carry;
				return array_merge($carry, $question['subquestions']);
			}, []);
			$answeredSubquestions = $answeredSubquestions->merge($subquestions);
		}
		return $answeredSubquestions->keyBy('id');
	}

	/**
	 * Generates from the given questions and answers the content of one tab.
	 * @param  array $questions
	 * @param  Illuminate\Support\Collection $answers
	 * @return array
	 */
	private function generateTabContent ($questions, $answers, $groupTitle)
	{
		$aggregatedQuestions = [];
		$this->images = [];

		foreach ($questions as $question) {
			if (count($question['subquestions']) === 0) {
				\Log::info('Found question without any subquestions. Skip it.', ['questionId' => $question['id']]);
				continue;
			}
			$preElements = $this->getPreElementsFromLabels($question['labels']);
			if (!empty($preElements)) {
				array_push($aggregatedQuestions, ...$preElements);
			}
			$aggregatedQuestions[] = $this->aggregateQuestion($question, $answers);
			$this->images = array_merge(
				$this->images,
				array_map([$this, 'buildImageVolume'], $question['images'])
			);
		}
		$this->images = $this->mergeImagesById($this->images);
		return [
			'title' => $groupTitle,
			'questions' => $aggregatedQuestions,
			'images' => array_values($this->images),
		];
	}

	/**
	 * Aggregates all subquestions of a question.
	 * We group the questions when
	 * 	- there are more then one subquestions attached
	 * 	- there is a label with the structure '$_PRISMA-Titel:TITLE'
	 * As group title we use one of
	 * - TITLE of label $_PRISMA-Titel:TITLE
	 * - name of question
	 * If only one subquestion is attached, we do not
	 * create tab-groups.
	 * @param  array $question
	 * @param  Illuminate\Support\Collection $answers
	 * @return array
	 */
	private function aggregateQuestion ($question, $answers)
	{
		$questionLabels = $question['labels'];
		$customTitle = $this->getTitleFromLabels($questionLabels);
		$overlayImages = $this->getImagesWithOverlay($question);

		if (empty($customTitle) && empty($overlayImages) && count($question['subquestions']) <= 1) {
			$subquestion = $question['subquestions'][0];
			if (!empty($questionLabels)) {
				$subquestion = $this->addSubquestionLabels($subquestion, 0, $questionLabels);
			}
			return $this->aggregateSubquestion($subquestion, $answers);
		}

		$questionGroup = [
			'id' => $question['id'],
			'title' => is_null($customTitle) ? $question['name'] : (empty($customTitle) ? null : $customTitle),
			'type' => 'group',
			'questions' => array_map(function ($subquestion, $key) use ($questionLabels, $answers) {
				if (!empty($questionLabels)) {
					$subquestion = $this->addSubquestionLabels($subquestion, $key, $questionLabels);
				}
				return $this->aggregateSubquestion($subquestion, $answers);
			}, $question['subquestions'], array_keys($question['subquestions'])),
		];
		if (!empty($overlayImages)) {
			$questionGroup['overlays'] = array_values(
				array_map(
					function ($image) {
						return [
							'imageId' => $image['id'],
							'overlayId' => implode(',', $image['overlays']),
						];
					}, $overlayImages
				)
			);
		}

		// Handle linked questions
		foreach ($questionGroup['questions'] as &$question) {
			if ($question['type'] === 'open' && isset($question['linked_marker_question_key'])) {
				$linkedQuestion = $questionGroup['questions'][$question['linked_marker_question_key']] ?? null;
				if (is_null($linkedQuestion) || $linkedQuestion['type'] !== 'marker') {
					\Log::info('Found wrong linked subquestion (invalid key or wrong type). Skip it.', ['subquestionId' => $question['id'], 'key' => $question['linked_marker_question_key']]);
				} else {
					$question['linked_marker_question_id'] = $linkedQuestion['id'];
				}
				unset($question['linked_marker_question_key']);
			}
		}

		return $questionGroup;
	}

	private function addSubquestionLabels ($subquestion, $key, $labels) {
		$rawSubquestionLabels = array_filter($labels, function ($label) use ($key) {
			return strpos($label, $this->labelPrepositions['subquestions'] . $key) !== false;
		});
		$subquestionLabels = array_map(function ($label) use ($key) {
			return str_replace($this->labelPrepositions['subquestions'] . $key, $this->labelPrepositions['subquestions'], $label);
		}, $rawSubquestionLabels);
		if (count($subquestionLabels) > 0) {
			$subquestion['labels'] = $subquestionLabels;
		}
		return $subquestion;
	}

	/**
	 * If the labels contain a label with the structure '$_PRISMA-Titel:TITLE'
	 * return TITLE. Otherwise return NULL
	 * @param  array $labels
	 * @return string|null
	 */
	private function getTitleFromLabels ($labels)
	{
		if (empty($labels)) {
			return;
		}
		$titleLabels = array_filter($labels, function ($label) { return strpos($label, $this->labelPrepositions['title']) !== false; });

		if (empty($titleLabels))
			return;

		return substr(array_pop($titleLabels), strlen($this->labelPrepositions['title']));
	}

	private function getSubquestionTitleFromLabels ($labels)
	{
		if (empty($labels)) {
			return;
		}
		$titleLabels = array_filter($labels, function ($label) { return strpos($label, $this->labelPrepositions['subquestion-title']) !== false; });

		if (empty($titleLabels))
			return;

		return substr(array_pop($titleLabels), strlen($this->labelPrepositions['subquestion-title']));
	}

	private function getPreElementsFromLabels ($labels)
	{
		$preLabels = array_filter($labels, function ($label) { return strpos($label, $this->labelPrepositions['pre']) !== false; });

		if (empty($preLabels))
			return;

		return array_map(function ($label) {
			$config = explode('|', substr($label, strlen($this->labelPrepositions['pre'])));
			$type = $config[0];
			$value = $config[1];
			return [
				'title' => $value,
				'type' => $type,
			];
		}, $preLabels);
	}

	/**
	 * Extracts images from the question that have additional overlays.
	 * All images with question-specific overlays are added to the tab-wide
	 * images pool.
	 *
	 * @param  array $question
	 * @return array $preparedImages
	 */
	private function getImagesWithOverlay($question)
	{
		if (!isset($question['images']))
			return [];

		$imagesWithOverlay = array_filter(
			$question['images'],
			function ($image) {
				return isset($image['overlays']);
			}
		);

		// TODO: needed? we do this already later
		$this->images = array_merge(
			$this->images,
			array_map([$this, 'buildImageVolume'], $imagesWithOverlay)
		);

		return $imagesWithOverlay;
	}

	/**
	 * Aggregates a generic subquestion. Acts as a wrapper for the specific question types.
	 * @param  array $subquestion
	 * @param  Illuminate\Support\Collection $answers
	 * @return array
	 */
	private function aggregateSubquestion($subquestion, $answers)
	{
		$subquestionAnswers = $answers->get($subquestion['id']);
		switch ($subquestion['type']) {
			case 'DD':
			case 'MC':
			case 'MM':
				$aggregatedSubquestion = $this->aggregateGivenChoices($subquestion, $subquestionAnswers);
				break;

			case 'Marker':
				$aggregatedSubquestion = $this->aggregateMarker($subquestion, $subquestionAnswers);
				break;

			case 'Open':
				$aggregatedSubquestion = $this->aggregateOpen($subquestion, $subquestionAnswers);
				break;
		}

		$aggregatedSubquestion['id'] = $subquestion['id'];
		$aggregatedSubquestion['title'] = $this->getTitleFromSubquestion($subquestion);
		return $aggregatedSubquestion;
	}

	/**
	 * Aggregates the answers of a given choice (DD, MM, MC) question
	 * @param  array $subquestion
	 * @param  array $answers
	 * @return array
	 */
	private function aggregateGivenChoices ($subquestion, $answers)
	{
		$element =  [
			'type' => 'basic',
			'attributes' => [],
		];

		if (!isset($answers['chosen_possibilities'])) {
			$answers['chosen_possibilities'] = [];
		}

		$frequencies = [];
		$additionalFrequencies = [];
		foreach ($answers['chosen_possibilities'] as $chosenPossibilities) {
			if (isset($chosenPossibilities['answer'])) {
				foreach ($chosenPossibilities['answer'] as $possibilityIndex) {
					if (!isset($frequencies[$possibilityIndex]))
						$frequencies[$possibilityIndex] = 1;
					else
						$frequencies[$possibilityIndex]++;
				}
			}
			if (isset($chosenPossibilities['additional_answers'])) {
				foreach ($chosenPossibilities['additional_answers'] as $possibility) {
					if (!isset($additionalFrequencies[$possibility]))
						$additionalFrequencies[$possibility] = 1;
					else
						$additionalFrequencies[$possibility]++;
				}
			}
		}

		// Insert value for chosen possibilities
		if ($subquestion['type'] === 'DD')
			$possibilities = $this->getListItems($subquestion['list_id']);
		else
			$possibilities = collect($subquestion['possibilities']);

		$attributes = [];
		foreach ($frequencies as $possibilityIndex => $frequency) {
			$possibility = $possibilities[$possibilityIndex];
			$value = $possibilities[$possibilityIndex]['option_text'];
			// skip possibility if list_entry does not exist (DD) or the possibilty text is
			if (empty($value))
				continue;
			$attributes[$possibilityIndex] = [
				'value' => $value,
				'frequency' => $frequency,
			];
		}

		$additionalAttributes = [];
		foreach ($additionalFrequencies as $value => $frequency) {
			$additionalAttributes[] = [
				'value' => $value,
				'frequency' => $frequency,
				'is_additional' => true,
			];
		}

		// Set correct possibilities
		// For DD questions iterate through 'correct_answers'
		if ($subquestion['type'] === 'DD') {
			foreach ($subquestion['correct_answers'] as $itemIndex) {
				if (!isset($frequencies[$itemIndex]))
					$attributes[$itemIndex] = [
						'value' => $possibilities[$itemIndex]['option_text'],
						'frequency' => 0,
					];
				$attributes[$itemIndex]['isCorrect'] = true;
			}
		// For MM and MC questions check for each possibility,
		// if the 'is_correct' flag is true
		} else {
			foreach ($subquestion['possibilities'] as $possibilityIndex => $possibility) {
				if (!$possibility['is_correct'])
					continue;
				if (!isset($attributes[$possibilityIndex]))
					$attributes[$possibilityIndex] = [
						'value' => $possibility['option_text'],
						'frequency' => 0,
					];
				$attributes[$possibilityIndex]['isCorrect'] = true;
			}
		}

		$element['attributes'] = array_merge(array_values($attributes), $additionalAttributes);
		return $element;
	}

	/**
	 * Aggregates the answers of a marker question
	 * @param  array $subquestion
	 * @param  array $answers
	 * @return array
	 */
	public function aggregateMarker ($subquestion, $answers)
	{
		$element = [
			'type' => 'marker',
			'imageId' => $subquestion['image_id'],
			'population' => 0,
		];

		if (!is_null($answers) && isset($answers['marker'])) {
			$element['marks'] = $answers['marker'];
			$element['population'] = count($element['marks']);
		}

		$image = [
			'id' => $subquestion['image_id'],
			'subquestion_id' => $subquestion['id'],
			'title' => $subquestion['subquestion_text'],
		];

		if (!empty($subquestion['overlays'])) {
			$element['overlayId'] = implode(',', $subquestion['overlays']);
		}

		$this->images[] = $this->buildImageVolume($image);

		return $element;
	}

	/**
	 * Aggregates the answers of an open text question
	 * @param  array $subquestion
	 * @param  array $answers
	 * @return array
	 */
	private function aggregateOpen ($subquestion, $answers)
	{
		$element = [
			'type' => 'open',
			'values' => [],
		];

		$linkedMarkerQuestionKey = $this->getLinkedMarkerSubquestionKeyFromOpenSubquestion($subquestion);
		if (!is_null($linkedMarkerQuestionKey)) {
			$element['linked_marker_question_key'] = $linkedMarkerQuestionKey;
		}

		if (is_null($answers))
			return $element;

		if (isset($element['linked_marker_question_key'])) {
			$element['values'] = $answers['answers'];
		} else {
			$element['values'] = array_filter(
				array_map(
					function ($answer) {
						return isset($answer['answer']) ? $answer['answer'] : null;
					}, $answers['answers']
				)
			);
		}

		return $element;
	}

	/**
	 * @param  array
	 * @return array
	 */
	private function buildImageVolume ($imageConfig, $type = 'image')
	{
		if (!isset($imageConfig['id'])) {
			throw new InvalidArgumentException('Image ID is missing for ImageVolume');
		}

		$imageInformation = $this->getStaticResource($type, $imageConfig['id']);

		$image = array_merge(
      $imageConfig,
      $imageInformation
    );

		if (!isset($image['type']) || !in_array($image['type'], ['wsi', 'meta'])) {
			$image['type'] = 'old';
		}

		if (isset($image['type']) && isset($image['url']) && $image['type'] === 'wsi') {
			$image['url'] = resolve('OmeroService')->prepareAndAuthenticateUrl($image['url']);
		}
		if (isset($image['type']) && isset($image['url']) && $image['type'] === 'meta') {
			$token = $this->getStaticResource('token')['token'];
			$params = [
				'imageId' => $image['id'],
				'windowCenter' => $image['windowCenter'] ?? 0,
				'windowWidth' => $image['windowWidth'] ?? 0,
				'token' => $token,
				'apiUrl' => $this->baseUrl,
			];
			if (!empty($image['position'])) {
				$params['slices'] = implode(',', $image['position']);
			}
			if (!empty($image['overlays'])) {
				$params['overlayIds'] = implode(',', $image['overlays']);
			}
			$image['url'] = $this->baseUrl . 'cornerstone-viewer/index.html?' . implode(
				'&',
				array_map(function ($key) use ($params) {
					return $key . '=' . $params[$key];
				}, array_keys($params))
			);
		}

		return $image;
	}

	private function mergeImagesById($images)
	{
		$mergedImages = [];
		foreach ($images as $image) {
			if (!isset($mergedImages[$image['id']])) {
				$mergedImages[$image['id']] = $image;
				continue;
			}
			$mergedImages[$image['id']] = array_merge($mergedImages[$image['id']], $image);
		}
		return $mergedImages;
	}

	/**
	 * Gets the answered questions for a given test id from vquest
	 * @param  int $testId
	 * @return array
	 */
	private function getAnswers ($testId)
	{
		$route = str_replace('{id}', $testId, $this->api['test-answers']);
		try {
			return $this->client->getJson($route, $this->filter);
		} catch (GuzzleHttp\Exception\RequestException $e) {
			if ($e->getCode() === 500) {
				return [];
			}
			throw $e;
		}
	}

	/**
	 * Returns all items of the list id as [id, option_text].
	 * We have to use 'option_text' as key for the item name, to use it
	 * together with MM and MC questions.
	 * @param  int $listId
	 * @return collection
	 */
	private function getListItems ($listId)
	{
		$list = $this->getStaticResource('list', $listId);
		if (is_null($list) || !isset($list['items']))
			return [];

		$items = array_map(function ($item) {
			return [
				'id' => $item['id'],
				'option_text' => $item['name'],
			];
		}, $list['items']);

		return collect($items);
	}

	private function getStaticResource($resource, $id = '')
	{
		$route = str_replace('{id}', $id, $this->api[$resource]);
		$seconds = $this->getCacheDurationForResource($resource);
		if (is_null($seconds)) {
			return $this->client->getJson($route);
		}
		if ($seconds > 0) {
			return Cache::remember($this->module . '/' . $route, $seconds, function () use ($route) {
				return $this->client->getJson($route);
			});
		}
		return Cache::rememberForever($this->module . '/' . $route, function () use ($route) {
			return $this->client->getJson($route);
		});

	}

	private function getCacheDurationForResource($endpoint)
	{
		$configKey = implode('.', [
			'modules',
			$this->module,
			'cache',
			$endpoint,
		]);
		$duration = config($configKey);
		if (is_null($duration)) {
			return;
		}

		if (is_array($duration)) {
			if (!isset($duration['duration'])) {
				return;
			}
			$duration = $duration['duration'];
		}

		if (!is_int($duration) && $duration <= 0) {
			return;
		}

		return $duration;
	}

	private function getTitleFromSubquestion ($subquestion)
	{
		if (isset($subquestion['labels'])) {
			$title = $this->getSubquestionTitleFromLabels($subquestion['labels']);
			if (!empty($title)) {
				return $title;
			}
		}
		return $this->transformSubquestionTitle($subquestion['subquestion_text']);
	}

	private function transformSubquestionTitle($title)
	{
		$configKey = implode('.', [
			'modules',
			$this->module,
			'transform',
			'subquestion-title',
		]);
		$replaceArray = config($configKey);
		if (empty($replaceArray)) {
			return $title;
		}

		return trim(str_replace(array_keys($replaceArray), array_values($replaceArray), $title));
	}

	private function getLinkedMarkerSubquestionKeyFromOpenSubquestion ($subquestion)
	{
		if (isset($subquestion['labels'])) {
			$linkLabels = array_filter($subquestion['labels'], function ($label) { return strpos($label, $this->labelPrepositions['subquestion-link']) !== false; });

			if (empty($linkLabels))
				return;

			return intval(substr(array_pop($linkLabels), strlen($this->labelPrepositions['subquestion-link'])));
		}
	}
}
