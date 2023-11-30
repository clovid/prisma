<?php

namespace App\Services;


/**
* @author Friedrich Pawelka <friedrich.pawelka@googlemail.com>
*
* Aggregates the test structure from vquest online and the answer data from vquest
*/
class VQuestHybridAggregator extends VQuestOnlineAggregator
{
	protected $module = 'vquest';

	protected $customDatasetAggregator;

  public function __construct($client = null)
  {
    parent::__construct($client);

		if (!empty(config('modules.' . $this->module . '.dataset-provider'))) {
			$datasetProvider = config('modules.' . $this->module . '.dataset-provider');
			$datasetProviderAggregationService = config('modules.' . $datasetProvider . '.aggregation-service');
			if ($datasetProviderAggregationService['type'] !== 'class') {
				\Log::error('We only support class based aggregation services for custom dataset provider.', ['datasetProvider' => $datasetProvider]);
			} else {
				$this->customDatasetAggregator = new $datasetProviderAggregationService['value'](new RequestService($datasetProvider));
			}
		}

  }

  protected function getAnswers($testId)
  {
		if (!$this->customDatasetAggregator) {
      return parent::getAnswers($testId);
    }
    $taskIdMap = config('modules.' . $this->module . '.dataset-id-mapping.task', []);
    $customTestId = array_search($testId, $taskIdMap, true);
    if (empty($customTestId)) {
      \Log::warning('Could not find mapping info for custom task id', ['id' => $testId]);
      return [];
    }
    $customAnswers = $this->customDatasetAggregator->getAnswers($customTestId, $this->filter);

    $questionMap = config('modules.' . $this->module . '.dataset-id-mapping.question', []);
    $subquestionMap = config('modules.' . $this->module . '.dataset-id-mapping.subquestion', []);

    // replace local ids (question, subquestion) with online ids
    foreach ($customAnswers as &$question) {
      $newQuestionId = $questionMap[$question['id']] ?? null;
      if (empty($newQuestionId)) {
        \Log::warning('Could not find mapping info for custom question id', ['id' => $question['id']]);
        continue;
      }
      $question['id'] = $newQuestionId;
      foreach ($question['subquestions'] as &$subquestion) {
        $newSubquestionId = $subquestionMap[$subquestion['id']] ?? null;
        if (empty($newSubquestionId)) {
          \Log::warning('Could not find mapping info for custom subquestion id', ['id' => $subquestion['id']]);
          continue;
        }
        $subquestion['id'] = $newSubquestionId;
        if (isset($subquestion['chosen_possibilities'])) {
          $subquestion['chosen_possibilities'] = array_map(function($possibility) {
            // Filter out answers with -1 (= not answered)
            $possibility['answer'] = array_values(
              array_filter($possibility['answer'], function ($answerIndex) {
                return $answerIndex >= 0;
              })
            );
            return $possibility;
          }, $subquestion['chosen_possibilities']);
          // filter out empty answers
          $subquestion['chosen_possibilities'] = array_values(
            array_filter($subquestion['chosen_possibilities'], function ($possibility) {
              return count($possibility['answer']) > 0;
            })
          );
        }
        // Filter out markers with -1 (= not answered)
        if (isset($subquestion['marker'])) {
          $subquestion['marker'] = array_values(
            array_filter($subquestion['marker'], function($marker) {
              return $marker['x'] >= 0;
            })
          );
        }
      }
    }
    return $customAnswers;
  }
}