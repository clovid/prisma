<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Requests\FilterRequest;

use App\Services\ModuleService;

use Auth;

/**
* @author Friedrich Pawelka <friedrich.pawelka@googlemail.com>
*/
class CampusDummyAPI extends Controller
{

	/**
	 * @todo Fix https://app.asana.com/0/80101886822552/395670494135840
	 * @todo answers (e.g. chosen_possibilities) should be on the root level
	 * @var [type]
	 */
	protected $dummyTests = [
			[
				'id' => '160129',
				'title' => 'Atemnot_Gelenkschmerzen',
				'number_of_datasets' => 1,
				'groups' => [
					[
						'name' => 'additional_content',
						'questions' => [
							[
								'id' => '884000000',
								'description' => 'additional_content',
								'type' => 'mc',
								'possibilities' => [],
								'chosen_possibilities' => [],
							]
						]
					]
				]
			],
			[
				'id' => '162066',
				'title' => 'SystematischeBefundungThorax',
				'number_of_datasets' => 1,
				'groups' => [
					[
						'name' => 'additional_content',
						'questions' => [
							[
								'id' => '884000000',
								'description' => 'additional_content',
								'type' => 'mc',
								'possibilities' => [],
								'chosen_possibilities' => [],
							]
						]
					]
				]
			],
			[
				'id' => '169882',
				'title' => 'fieber01',
				'number_of_datasets' => 1,
				'groups' => [
					[
						'name' => 'additional_content',
						'questions' => [
							[
								'id' => '884000000',
								'description' => 'additional_content',
								'type' => 'mc',
								'possibilities' => [],
								'chosen_possibilities' => [],
							]
						]
					]
				]
			],
		];

	public function tests (Request $request)
	{
		$tests = array_map([$this, 'testToSimple'], $this->dummyTests);
		return response()->json($tests);
	}

	public function testsCountDatasets (Request $request)
	{
		$numberOfDatasets = 0;
		foreach ($this->dummyTests as $dummyTest) {
			$numberOfDatasets += $dummyTest['number_of_datasets'];
		}
		return response()->json([
			'number_of_datasets' => $numberOfDatasets,
		]);
	}

	public function test (Request $request, $id)
	{
		$test = array_filter($this->dummyTests, function ($test) use ($id) { return $test['id'] == $id; });
		if (empty($test))
			return response()->json([
				'error' => 'No test with ' . $id . ' found',
			], 404);

		return response()->json($this->testToFull(array_pop($test)));
	}

	public function testAnswers (Request $request, $id)
	{
		$test = array_filter($this->dummyTests, function ($test) use ($id) { return $test['id'] == $id; });

		if (empty($test))
			return response()->json([
				'error' => 'No test with ' . $id . ' found',
			], 404);

		return response()->json($this->testToAnswers(array_pop($test)));
	}

	public function testCountDatasets (Request $request, $id)
	{
		foreach ($this->dummyTests as $dummyTest) {
			if ($dummyTest['id'] == $id)
				return response()->json([
					'number_of_datasets' => $dummyTest['number_of_datasets'],
				]);
		}

		return response()->json([
			'error' => 'No test with ' . $id . ' found',
		], 404);
	}

	private function testToSimple ($test)
	{
		return [
			'id' => $test['id'],
			'title' => $test['title'],
			'number_of_datasets' => $test['number_of_datasets'],
			// 'created_at' => $test['created_at'],
		];
	}

	private function testToFull ($test)
	{
		return [
			'id' => $test['id'],
			'title' => $test['title'],
			// 'created_at' => $test['created_at'],
			'groups' => isset($test['answers']) ? $test['groups'] : [],
		];
	}

	private function testToAnswers ($test)
	{
		return isset($test['answers']) ? $test['answers'] : [];
	}

}
