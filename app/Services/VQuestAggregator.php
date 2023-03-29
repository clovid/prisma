<?php

namespace App\Services;

use Log;
use Cache;
use InvalidArgumentException;
use Illuminate\Support\Str;

use App\ImageVolume;

/**
* @author Friedrich Pawelka <friedrich.pawelka@googlemail.com>
*
* Aggregates the data from vquest
*/
class VQuestAggregator
{
	protected $module = 'vquest';

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
		'subquestions' => '$_PRISMA-Subq',
		'subquestion-title' => '$_PRISMA-SubqTitle:',
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
		$this->images = $this->loadSlices($this->images);
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
			'title' => empty($customTitle) ? $question['name'] : $customTitle,
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
							'imageId' => (int) $image['id'],
							'overlayId' => (int) $image['overlay']['id'],
						];
					}, $overlayImages
				)
			);
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
	 * Extracts images from the question that have an additional overlay.
	 * All images with question-specific overlay are added to the tab-wide
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
				return isset($image['overlay']);
			}
		);

		// TODO: needed? we don't use the question id at the moment
		$imagesWithOverlayAndQuestionId = array_map(
			function ($image) use ($question) {
				$image['question_id'] = $question['id'];
				return $image;
			},
			$imagesWithOverlay
		);

		// TODO: needed? we do this already later
		$this->images = array_merge(
			$this->images,
			array_map([$this, 'buildImageVolume'], $imagesWithOverlayAndQuestionId)
		);

		return $imagesWithOverlayAndQuestionId;
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
				return $this->aggregateGivenChoices($subquestion, $subquestionAnswers);

			case 'Marker':
				return $this->aggregateMarker($subquestion, $subquestionAnswers);

			case 'Open':
				return $this->aggregateOpen($subquestion, $subquestionAnswers);
		}
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
			'title' => $this->getTitleFromSubquestion($subquestion),
			'type' => 'basic',
			'attributes' => [],
		];

		if (!isset($answers['chosen_possibilities'])) {
			$answers['chosen_possibilities'] = [];
		}

		$frequencies = [];
		$additionalFrequencies = [];
		foreach ($answers['chosen_possibilities'] as $chosenPossibilities) {
			foreach ($chosenPossibilities['answer'] as $possibility) {
				if (!isset($frequencies[$possibility]))
					$frequencies[$possibility] = 1;
				else
					$frequencies[$possibility]++;
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
			$possibilities = collect($subquestion['possibilities'])->keyBy('id');

		$attributes = [];
		foreach ($frequencies as $possibilityId => $frequency) {
			$value = $possibilities->get($possibilityId)['option_text'];
			// skip possibility if list_entry does not exist (DD) or the possibilty text is
			if (empty($value))
				continue;
			$attributes[$possibilityId] = [
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
			foreach ($subquestion['correct_answers'] as $itemId) {
				if (!isset($frequencies[$itemId]))
					$attributes[$itemId] = [
						'value' => $possibilities[$itemId]['option_text'],
						'frequency' => 0,
					];
				$attributes[$itemId]['isCorrect'] = true;
			}
		// For MM and MC questions check for each possibility,
		// if the 'is_correct' flag is true
		} else {
			foreach ($subquestion['possibilities'] as $possibility) {
				if (!$possibility['is_correct'])
					continue;
				if (!isset($attributes[$possibility['id']]))
					$attributes[$possibility['id']] = [
						'value' => $possibility['option_text'],
						'frequency' => 0,
					];
				$attributes[$possibility['id']]['isCorrect'] = true;
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
			'id' => $subquestion['id'],
			'title' => $this->getTitleFromSubquestion($subquestion),
			'type' => 'marker',
			'imageId' => (int) $subquestion['image_id'],
			'overlayId' => (int) $subquestion['overlay']['id'],
			'population' => 0,
		];

		if (!is_null($answers) && isset($answers['marker'])) {
			$element['marks'] = $this->getValidMarks($answers['marker']);
			$element['population'] = count($element['marks']);
		}

		$image = [
			'id' => (int) $subquestion['image_id'],
			'subquestion_id' => (int) $subquestion['id'],
			'title' => $subquestion['subquestion_text'],
			'overlay' => $subquestion['overlay'],
		];
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
			'title' => $this->getTitleFromSubquestion($subquestion) . $subquestion['additional_text'],
			'type' => 'open',
			'values' => [],
		];

		if (is_null($answers))
			return $element;

		$element['values'] = array_filter(
			array_map(
				function ($answer) {
					return isset($answer['answer']) ? $answer['answer'] : null;
				}, $answers['answers']
			)
		);

		return $element;
	}

	/**
	 * Caches an image and returns the cached image
	 * @param  array
	 * @return ImageVolume
	 */
	private function buildImageVolume ($imageConfig, $type = 'image')
	{
		if (!isset($imageConfig['id'])) {
			throw new InvalidArgumentException('Image ID is missing for ImageVolume');
		}
		$imageId = (int) $imageConfig['id'];

		$imageInformation = $this->getStaticResource($type, $imageId);

		$image = new ImageVolume($imageId, array_merge($imageConfig, $imageInformation), $type);

		if (isset($imageConfig['overlay'])) {
			$overlay = $this->buildImageVolume($imageConfig['overlay'], 'overlay');
			$image->addOverlay($overlay);
		}

		return $image;
	}

	private function loadSlices($images)
	{
		foreach ($images as &$image) {
			$hash = $image->getHash();
			$image->slices = Cache::rememberForever($hash, function () use ($image) {
				$imageSlices = $this->buildSlices($image, ['orientation' => $image->getOrientation()]);
				foreach ($image->getOverlays() as $overlay) {
					$overlaySlices = $this->buildSlices($overlay, [
						'attributes' => ['id'],
						'orientation' => $image->getOrientation()
					]);
					$startSliceNumber = $overlay->getOffset($image->getOrientation());
					$endSliceNumber = $overlay->getOffset($image->getOrientation()) + $overlay->getDimensions($image->getOrientation());
					for ($i = $startSliceNumber; $i < $endSliceNumber; $i++) {
						if (!isset($imageSlices[$i]['overlays'])) {
							$imageSlices[$i]['overlays'] = [];
						}
						$imageSlices[$i]['overlays'][] = $overlaySlices[$i - $startSliceNumber];
					}
				}
				return $imageSlices;
			});
		}
		return $images;
	}

	private function buildSlices(ImageVolume $image, $config = [])
	{
		$slices = [];
		$initialSlice = [];

		if (empty($config['orientation'])) {
			throw new InvalidArgumentException('Orientation missing while building slices');
		}
		$orientation = $config['orientation'];

		if (isset($config['attributes'])) {
			if (in_array('id', $config['attributes'])) {
				$initialSlice['id'] = $image->id;
			}
			if (in_array('dimensions', $config['attributes'])) {
				$initialSlice['dimensions'] = $image->getDimensionsForOrientation($orientation);
			}
			if (in_array('offset', $config['attributes'])) {
				$initialSlice['offset'] = $image->getOffsetForOrientation($orientation);
			}
		}

		$route = $this->baseUrl . str_replace('{id}', $image->id, $this->api[$image->type]);
		$parameter = ['orientation' => $orientation];
		if ($image->type === 'image' && isset($image->currentWindow)) {
			$parameter['window_level'] = $image->currentWindow['level'];
			$parameter['window_width'] = $image->currentWindow['width'];
		}

		for ($i = 0; $i < $image->getDimensions($orientation); $i++) {
			$sliceRoute = $route . '/' . str_replace('{number}', $i, $this->api['slice']);
			$hash = $this->prepareFile($sliceRoute, $parameter, $image->id . '-' . $i);
			$slice = ['hash' => $hash];
			if ($image->type === 'image') {
				$slice['i'] = $i;
			}
			$slices[] = array_merge($initialSlice, $slice);
		}

		return $slices;
	}

	private function mergeImagesById($images)
	{
		$mergedImages = [];
		foreach ($images as $image) {
			if (!isset($mergedImages[$image->id])) {
				$mergedImages[$image->id] = $image;
				continue;
			}
			$mergedImages[$image->id] = $mergedImages[$image->id]->merge($image);
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

		return collect($items)->keyBy('id');
	}

	/**
	 * Caches the information to retrieve a specific file with specific parameter.
	 * Returns an unique id to work with.
	 * @param  string $url       e.g. images/2
	 * @param  array $parameter e.g. ['x' => 1, 'y' => 2, 'z' => 3]
	 * @param   $salt to make sure hash is unique, but reproducible
	 * @return string            unique file id
	 */
	private function prepareFile ($url, $parameter = [], $salt = '')
	{
		// check if file config is already cached
		$hash = md5($url . json_encode($parameter)) . '-' . $salt;
		Cache::rememberForever($hash, function () use ($url, $parameter) {
			return [
				'module' => $this->module,
				'url' => $url,
				'parameter' => $parameter,
			];
		});
		return $hash;
	}

	private function getValidMarks($marker)
	{
		$transformedMarks = array_map(
			function ($marks) {
				if (
					!isset($marks['x']) || $marks['x'] === -1 ||
					!isset($marks['y']) || $marks['y'] === -1 ||
					!isset($marks['z']) || $marks['z'] === -1
				) {
					return;
				}
				return [$marks['x'], $marks['y'], $marks['z']];
			},
			$marker
		);
		return array_values(array_filter($transformedMarks));
	}

	private function getStaticResource($resource, $id)
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
}
