<?php

namespace App\Services;

use Log;
use Cache;

/**
* @author Friedrich Pawelka <friedrich.pawelka@googlemail.com>
*
* Aggregates the data from campus
*/
class CampusAggregator
{
	protected $module = 'campus';

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
	 * Array of different routes for the communication with the campus API
	 * @var array [tests]
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
			'test-answers' => 'cases/{id}/answers',
			'list' => 'list/{id}/items'
		];
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
		$answers = $this->getAnsweredQuestions($testIds);
		// Generate the result which contains all subquestions including
		$tabs = [];
		foreach ($groups as $groupName => $questions) {
			$tabName = camel_case(str_slug($groupName)); // same as in CampusTabCollector
			$tabs[$tabName] = $this->generateTabContent($questions, $answers, $tabName);
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
		$route = str_replace('{id}', $testId, $this->api['test']);
		$test = $this->client->getJson($route);
		if (is_null($test) || !isset($test['groups']))
			return [];
		return $test['groups'];
	}

	/**
	 * Returns all subquestions for a given set of test ids
	 * @param  array $testIds
	 * @return Illuminate\Support\Collection
	 */
	private function getAnsweredQuestions($testIds)
	{
		$answeredQuestions = collect();
		foreach ($testIds as $testId) {
			$answers = $this->getAnswers($testId);
			$answeredQuestions = $answeredQuestions->merge($answers);
		}
		return $answeredQuestions->keyBy('id');
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

		foreach ($questions as $question) {
			$aggregatedQuestion = $this->aggregateQuestion($question, $answers);
			if (empty($aggregatedQuestion)) {
				continue;
			}
			$aggregatedQuestions[] = $aggregatedQuestion;
		}
		return [
			'title' => $groupTitle,
			'questions' => $aggregatedQuestions,
		];
	}

	/**
	 * Aggregates all answers of a question.
	 * @param  array $question
	 * @param  Illuminate\Support\Collection $answers
	 * @return array
	 */
	private function aggregateQuestion ($question, $answers)
	{
		$questionAnswers = $answers->get($question['id']);
		if (!isset($question['type'])) {
			return;
		}
		switch ($question['type']) {
			case 'longlist':
				return $this->aggregateLonglist($question, $questionAnswers);
			case 'mc':
				return $this->aggregateMc($question, $questionAnswers);
			case 'ranking':
				return $this->aggregateRanking($question, $questionAnswers);
			case 'freetext':
				return $this->aggregateFreetext($question, $questionAnswers);
			// TODO: more question types
		}

	}

	private function aggregateLonglist($question, $answers)
	{
		// Most of the questions only have one question group with the same
		// "description" as the tab/group.
		$questionTitle = config('modules.' . $this->module . '.tab-titles.' . $question['description'], $question['description']);
		$element = [
			'title' => $questionTitle,
			'type' => 'basic',
			'attributes' => [],
		];

		$list = $this->getListItems($question['list_id']);
		if (empty($list)) {
			return $element;
		}

		$attributes = [];
		foreach ($question['possibilities'] as $possibility) {
			$possibilityId = (string) $possibility['id'];
			$listItem = $list->where('id', $possibilityId)->first();
			if (empty($listItem)) {
				Log::warning('Could not find list item for correct possibility', ['possibility' => $possibilityId, 'listId' => $question['list_id']]);
				continue;
			}
			$attributes[$possibilityId] = [
				'value' => $listItem['option_text'],
				'frequency' => 0,
				'isCorrect' => true,
			];
		}

		if (isset($answers['chosen_possibilities'])) {
			$chosenPossibilities = $answers['chosen_possibilities'];
			foreach ($chosenPossibilities as $userAnswers) {
				if (!isset($userAnswers['answer'])) {
					continue;
				}
				// TODO: remove this check when classic cases return also an array
				if (!is_array($userAnswers['answer'])) {
					$userAnswers = explode(',', $userAnswers['answer']);
				} else {
					$userAnswers = $userAnswers['answer'];
				}
				foreach ($userAnswers as $userAnswer) {
					$listItem = $list->where('id', $userAnswer)->first();
					if (empty($listItem)) {
						Log::warning('Could not find list item for chosen possibility', ['possibility' => $userAnswer, 'listId' => $question['list_id']]);
						continue;
					}
					if (!isset($attributes[$userAnswer])) {
						$attributes[$userAnswer] = [
							'value' => $listItem['option_text'],
							'frequency' => 0,
							'isCorrect' => false,
						];
					}
					$attributes[$userAnswer]['frequency']++;
				}
			}
		}

		$element['attributes'] = array_values($attributes);
		return $element;
	}

	/**
	 * Prepares a mc question.
	 * @todo Check if this could refactored with longlist type.
	 * @param  array $question
	 * @param  array $answers
	 * @return array
	 */
	private function aggregateMc($question, $answers)
	{
		// Most of the questions only have one question group with the same
		// "description" as the tab/group.
		$questionTitle = $question['description'];
		$element = [
			'title' => $questionTitle,
			'type' => 'basic',
			'attributes' => [],
		];

		$attributes = [];
		if (isset($question['possibilities'])) {
			foreach ($question['possibilities'] as $possibility) {
				$possibilityId = (string) $possibility['id'];
				$attributes[$possibilityId] = [
					'value' => $possibility['description'],
					'frequency' => 0,
					'isCorrect' => $possibility['is_correct'],
				];
			}
		}

		if (isset($answers['chosen_possibilities'])) {
			$chosenPossibilities = $answers['chosen_possibilities'];
			foreach ($chosenPossibilities as $userAnswers) {
				if (!isset($userAnswers['answer'])) {
					continue;
				}
				// TODO: remove this check when classic cases return also an array
				if (!is_array($userAnswers['answer'])) {
					$userAnswers = explode(',', $userAnswers['answer']);
				} else {
					$userAnswers = $userAnswers['answer'];
				}
				foreach ($userAnswers as $userAnswer) {
					if (!isset($attributes[$userAnswer])) {
						// Add missing IDs as new incorrect possibilities
						$attributes[$userAnswer] = [
							'value' => $userAnswer,
							'frequency' => 1,
							'isCorrect' => false,
						];
					} else {
						$attributes[$userAnswer]['frequency']++;
					}
				}
			}
		}

		// Filter all wrong possibilities with no frequency
		$attributes = array_filter($attributes, function ($attribute) {
			return $attribute['frequency'] > 0 || $attribute['isCorrect'];
		});

		$element['attributes'] = array_values($attributes);
		return $element;
	}

	/**
	 * Prepares a ranking question.
	 * @param  array $question
	 * @param  array $answers
	 * @return array
	 * @todo Implement logic
	 */
	private function aggregateRanking($question, $answers)
	{
		$questionTitle = $question['description'];
		$element = [
			'title' => $questionTitle,
			'type' => 'ranking',
			'attributes' => [],
		];

		$attributes = [];
		if (isset($question['possibilities'])) {
			$numberOfPossibilities = count($question['possibilities']);
			foreach ($question['possibilities'] as $possibility) {
				$possibilityId = (string) $possibility['id'];
				$attributes[$possibilityId] = [
					'value' => $possibility['description'],
					'ranks' => array_fill(0, $numberOfPossibilities, 0),
					'correctRank' => $possibility['rank'],
				];
			}
		}

		if (isset($answers['chosen_possibilities'])) {
			$chosenPossibilities = $answers['chosen_possibilities'];
			foreach ($chosenPossibilities as $userAnswer) {
				if (!isset($userAnswer['answer'])) {
					continue;
				}

				// TODO: remove this check when classic cases return also an array
				if (!is_array($userAnswer['answer'])) {
					$rankedPossibilityIds = explode(',', $userAnswer['answer']);
				} else {
					$rankedPossibilityIds = $userAnswer['answer'];
				}
				foreach ($rankedPossibilityIds as $rank => $possibilityId) {
					if (!isset($attributes[$possibilityId])) {
						Log::warning('Could not find ranked possibility in available possibilities', ['question' => $question['id'], 'rankedPossibilityId' => $possibilityId]);
						continue;
					}
					$attributes[$possibilityId]['ranks'][$rank]++;
				}
			}
		}

		$element['attributes'] = array_values($attributes);
		return $element;
	}

	/**
	 * Aggregates all freetext answers for a freetext question.
	 * @param  array $question
	 * @param  array $answers
	 * @return array
	 */
	private function aggregateFreetext($question, $answers)
	{
		$element = [
			'title' => $question['description'],
			'type' => 'open',
			'values' => [],
		];

		if (is_null($answers))
			return $element;
		if (!isset($answers['chosen_possibilities'])) {
			Log::warning('Wrong structure for freetext answer: chosen_possibilities attribute missing.',
				[
					'question' => $question,
					'chosen_possibilities' => $answers,
				]);
		} else {
			$element['values'] = array_filter(
				array_map(
					function ($answer) {
						return isset($answer['answer']) ? $answer['answer'] : null;
					},
					$answers['chosen_possibilities']
				)
			);
		}

		return $element;
	}

	/**
	 * Gets the answered questions for a given test id
	 * @param  int $testId
	 * @return array
	 */
	private function getAnswers ($testId)
	{
		$route = str_replace('{id}', $testId, $this->api['test-answers']);
		$answers = $this->client->getJson($route, $this->filter);
		return $answers;
	}

	/**
	 * Returns all items of the list id as [id, option_text].
	 * @param  int $listId
	 * @return collection
	 */
	private function getListItems ($listId)
	{
		$route = str_replace('{id}', $listId, $this->api['list']);
		try {
			$list = $this->client->getJson($route);
		} catch (\GuzzleHttp\Exception\ClientException $e) {
			if ($e->getCode() !== 404) {
				throw $e;
			}
			Log::warning('Could not find list', ['route' => $route]);
			return [];
		}
		if (is_null($list))
			return [];

		$items = array_map(function ($item) {
			return [
				'id' => $item['id'],
				'option_text' => $item['description'],
			];
		}, $list);

		return collect($items);
	}

}
