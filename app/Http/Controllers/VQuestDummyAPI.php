<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Requests\FilterRequest;

use App\Services\ModuleService;

use Auth;

/**
* @author Friedrich Pawelka <friedrich.pawelka@googlemail.com>
*/
class VQuestDummyAPI extends Controller
{
	protected $version = '1.5';
	protected $dummyTests = [
			[
				'id' => 1,
				'title' => 'Kurs: Thorax, Indikation',
				'number_of_datasets' => 3,
				'created_at' => [
					'timestamp' => 1474274356000,
					'timezone' => 'UTC+2',
				],
				'groups' => [
					[
						'name' => 'Aufnahmequalität',
						'questions' => [
							[
								'id' => 11,
								'domain' => '',
								'case_text' => '',
								'labels' => ['a', 'b', 'c'],
								'images' => [
									['id' => 1, 'title' => ''],
								],
								'subquestions' => [
									[
										'id' => 40,
										'type' => '',
										'subquestion_text' => '',
									],
								],
							],
						],
					],
				],
				'answers' => [
					[
						'id' => 11,
						'subquestions' => [
							[
								'id' => 40,
							],
						],
					],
				],
			],
			[
				'id' => 2,
				'title' => 'Kurs: Thorax, Fall 1',
				'number_of_datasets' => 8,
				'created_at' => [
					'timestamp' => 1474274356000,
					'timezone' => 'UTC+2',
				],
				'groups' => [
					[
						'name' => 'Aufnahmequalität',
						'questions' => [
							[
								'id' => 1,
								'domain' => '',
								'case_text' => 'Aufnahmeart',
								'name' => 'Aufnahmeart',
								'labels' => ['a', 'b', 'c'],
								'images' => [
									['id' => 1, 'title' => ''],
								],
								'subquestions' => [
									[
										'id' => 1,
										'type' => 'MC',
										'subquestion_text' => 'Diese Aufnahme ist ein Projektionsradiographie des/der ...',
										'possibilities' => [
											[
												'id' => 1,
												'option_text' => 'Thorax in zwei Ebenen (posterior-anterior / lateral)',
												'is_correct' => false,
											],
											[
												'id' => 2,
												'option_text' => 'Thorax  in einer Ebene (posterior-anterior)',
												'is_correct' => true,
											],
											[
												'id' => 3,
												'option_text' => 'Thorax im Liegen (anterior-posterior)',
												'is_correct' => false,
											],
											[
												'id' => 4,
												'option_text' => 'Thorax in Exspiration (posterior-anterior)',
												'is_correct' => false,
											],
											[
												'id' => 5,
												'option_text' => 'Rippen Weichstrahltechnik in zwei Ebenen',
												'is_correct' => false,
											],
										],
									],
								],
							],
							[
								'id' => 2,
								'domain' => '',
								'case_text' => 'Aufnahmequalität',
								'name' => 'Aufnahmequalität',
								'labels' => ['a', 'b', 'c'],
								'images' => [
									['id' => 1, 'title' => ''],
								],
								'subquestions' => [
									[
										'id' => 2,
										'type' => 'MM',
										'subquestion_text' => 'Welcher Teil des Thorax ist nicht abgebildet?',
										'possibilities' => [
											[
												'id' => 6,
												'option_text' => 'Alles ist vollständig abgebildet',
												'is_correct' => true,
											],
											[
												'id' => 7,
												'option_text' => 'Die obere Thoraxapertur',
												'is_correct' => true,
											],
											[
												'id' => 8,
												'option_text' => 'Der rechte laterale Thorax',
												'is_correct' => false,
											],
											[
												'id' => 9,
												'option_text' => 'Der linke laterale Thorax',
												'is_correct' => false,
											],
											[
												'id' => 10,
												'option_text' => 'Der rechte laterale Recessus',
												'is_correct' => false,
											],
										],
									],
									[
										'id' => 3,
										'type' => 'MC',
										'subquestion_text' => 'Wie ist die Belichtung?',
										'possibilities' => [
											[
												'id' => 11,
												'option_text' => 'Korrekte Belichtung',
												'is_correct' => true,
											],
											[
												'id' => 12,
												'option_text' => 'Überbelichtung (analog)',
												'is_correct' => false,
											],
											[
												'id' => 13,
												'option_text' => 'Unterbelichtung (digital)',
												'is_correct' => false,
											],
											[
												'id' => 14,
												'option_text' => 'Unterbelichtung (analog)',
												'is_correct' => false,
											],
										],
									],
									[
										'id' => 4,
										'type' => 'MC',
										'subquestion_text' => 'Wie ist die Rotation?',
										'possibilities' => [
											[
												'id' => 15,
												'option_text' => 'Die Aufnahme ist korrekt rotiert',
												'is_correct' => true,
											],
											[
												'id' => 16,
												'option_text' => 'Es liegt eine LAO-Rotation vor',
												'is_correct' => false,
											],
											[
												'id' => 17,
												'option_text' => 'Es liegt eine RAO-Rotation vor',
												'is_correct' => false,
											],
										],
									],
									[
										'id' => 5,
										'type' => 'MC',
										'subquestion_text' => 'Wie ist die Röhrenkippung?',
										'possibilities' => [
											[
												'id' => 18,
												'option_text' => 'Die Röhre wurde korrekt gekippt',
												'is_correct' => true,
											],
											[
												'id' => 19,
												'option_text' => 'Es liegt eine Röhrenkippung nach kranial vor',
												'is_correct' => false,
											],
											[
												'id' => 20,
												'option_text' => 'Es liegt eine Röhrenkippung nach kaudal vor',
												'is_correct' => false,
											],
										],
									],
								],
							],
						],
					],
					[
						'name' => 'Anatomische Landmarken',
						'questions' => [
							[
								'id' => 3,
								'domain' => '',
								'case_text' => 'Zwerchfell',
								'name' => 'Zwerchfell',
								'labels' => ['a', 'b', 'c'],
								'images' => [
									['id' => 1, 'title' => 'Bild 1'],
								],
								'subquestions' => [
									[
										'id' => 6,
										'type' => 'DD',
										'subquestion_text' => 'Das Zwerchfell ...',
										'list_id' => 2,
										'correct_answers' => [1],
										'number_of_possible_answers' => 5
									],
								],
							],
							[
								'id' => 4,
								'domain' => '',
								'case_text' => 'Herz',
								'name' => 'Herz',
								'labels' => ['a', 'b', 'c'],
								'images' => [
									['id' => 2, 'title' => 'Bild 2'],
								],
								'subquestions' => [
									[
										'id' => 7,
										'type' => 'DD',
										'subquestion_text' => 'Das Herz ...',
										'list_id' => 2,
										'correct_answers' => [3, 4],
										'number_of_possible_answers' => 5
									],
								],
							],
							[
								'id' => 5,
								'domain' => '',
								'case_text' => 'Pathologien zeigen',
								'name' => 'Pathologien zeigen',
								'labels' => ['a', 'b', 'c', '$_PRISMA-Titel:Titeltüst 1'],
								'images' => [
									['id' => 2, 'title' => 'Bild 2', 'overlay' => 1],
								],
								'subquestions' => [
									[
										'id' => 8,
										'type' => 'Marker',
										'subquestion_text' => 'Markieren sie die relevanten Abweichungen im Bild',
										'image_id' => 2,
										'overlay_id' => 1,
									],
								],
							],
						],
					],
					[
						'name' => 'Befund/Synthese',
						'questions' => [
							[
								'id' => 6,
								'domain' => '',
								'case_text' => 'Diagnostizieren',
								'name' => 'Diagnostizieren',
								'labels' => ['a', 'b', 'c', '$_PRISMA-Titel:Titeltüst #2 haha'],
								'images' => [
									['id' => 3, 'title' => 'Bild 3'],
								],
								'subquestions' => [
									[
										'id' => 9,
										'type' => 'DD',
										'subquestion_text' => 'Zu welchen Hauptdiagnosen kommen Sie?',
										'list_id' => 1,
										'correct_answers' => [1, 4],
										'number_of_possible_answers' => 5
									],
									[
										'id' => 10,
										'type' => 'DD',
										'subquestion_text' => 'Zu welchen Nebendiagnosen kommen Sie?',
										'list_id' => 1,
										'correct_answers' => [1, 2, 3],
										'number_of_possible_answers' => 5
									],
									[
										'id' => 99,
										'type' => 'Open',
										'subquestion_text' => 'Freitext?',
										'additional_text' => ' ??',
									],
								],
							],
						],
					],
				],
				'answers' => [
					[
						'id' => 1,
						'subquestions' => [
							[
								'id' => 1,
								'chosen_possibilities' => [
									[
										'user_id' => 1,
										'answer' => [2],
									],
									[
										'user_id' => 2,
										'answer' => [2],
									],
									[
										'user_id' => 3,
										'answer' => [3],
									],
									[
										'user_id' => 4,
										'answer' => [2],
									],
									[
										'user_id' => 5,
										'answer' => [3],
									],
									[
										'user_id' => 6,
										'answer' => [4],
									],
									[
										'user_id' => 7,
										'answer' => [1],
									],
									[
										'user_id' => 8,
										'answer' => [2],
									],
								],
							],
						],
					],
					[
						'id' => 2,
						'subquestions' => [
							[
								'id' => 2,
								'chosen_possibilities' => [
									[
										'user_id' => 1,
										'answer' => [2,9],
									],
									[
										'user_id' => 2,
										'answer' => [2,8],
									],
									[
										'user_id' => 3,
										'answer' => [3],
									],
									[
										'user_id' => 4,
										'answer' => [2],
									],
									[
										'user_id' => 5,
										'answer' => [2],
									],
									[
										'user_id' => 6,
										'answer' => [1,2],
									],
									[
										'user_id' => 7,
										'answer' => [3],
									],
									[
										'user_id' => 8,
										'answer' => [9],
									],
								],
							],
							[
								'id' => 3,
								'chosen_possibilities' => [
									[
										'user_id' => 1,
										'answer' => [2],
									],
									[
										'user_id' => 2,
										'answer' => [2],
									],
									[
										'user_id' => 3,
										'answer' => [3],
									],
									[
										'user_id' => 4,
										'answer' => [2],
									],
									[
										'user_id' => 5,
										'answer' => [3],
									],
									[
										'user_id' => 6,
										'answer' => [4],
									],
									[
										'user_id' => 7,
										'answer' => [1],
									],
									[
										'user_id' => 8,
										'answer' => [2],
									],
								],
							],
							[
								'id' => 4,
								'chosen_possibilities' => [
									[
										'user_id' => 1,
										'answer' => [2],
									],
									[
										'user_id' => 2,
										'answer' => [2],
									],
									[
										'user_id' => 3,
										'answer' => [3],
									],
									[
										'user_id' => 4,
										'answer' => [2],
									],
									[
										'user_id' => 5,
										'answer' => [3],
									],
									[
										'user_id' => 6,
										'answer' => [1],
									],
									[
										'user_id' => 7,
										'answer' => [1],
									],
									[
										'user_id' => 8,
										'answer' => [2],
									],
								],
							],
							[
								'id' => 5,
								'chosen_possibilities' => [
									[
										'user_id' => 1,
										'answer' => [2],
									],
									[
										'user_id' => 2,
										'answer' => [2],
									],
									[
										'user_id' => 3,
										'answer' => [3],
									],
									[
										'user_id' => 4,
										'answer' => [2],
									],
									[
										'user_id' => 5,
										'answer' => [3],
									],
									[
										'user_id' => 6,
										'answer' => [3],
									],
									[
										'user_id' => 7,
										'answer' => [1],
									],
									[
										'user_id' => 8,
										'answer' => [2],
									],
								],
							],
						],
					],
					[
						'id' => 3,
						'subquestions' => [
							[
								'id' => 6,
								'chosen_possibilities' => [
									[
										'user_id' => 1,
										'answer' => [2],
									],
									[
										'user_id' => 2,
										'answer' => [2,3],
									],
									[
										'user_id' => 3,
										'answer' => [3,4],
									],
									[
										'user_id' => 4,
										'answer' => [2,4],
									],
									[
										'user_id' => 5,
										'answer' => [3],
									],
									[
										'user_id' => 6,
										'answer' => [4],
									],
									[
										'user_id' => 7,
										'answer' => [],
									],
									[
										'user_id' => 8,
										'answer' => [2],
									],
								],
							],
						],
					],
					[
						'id' => 4,
						'subquestions' => [
							[
								'id' => 7,
								'chosen_possibilities' => [
									[
										'user_id' => 1,
										'answer' => [2],
									],
									[
										'user_id' => 2,
										'answer' => [2,3],
									],
									[
										'user_id' => 3,
										'answer' => [3,4],
									],
									[
										'user_id' => 4,
										'answer' => [2,4],
									],
									[
										'user_id' => 5,
										'answer' => [3],
									],
									[
										'user_id' => 6,
										'answer' => [4],
									],
									[
										'user_id' => 7,
										'answer' => [],
									],
									[
										'user_id' => 8,
										'answer' => [2],
									],
								],
							],
						],
					],
					[
						'id' => 5,
						'subquestions' => [
							[
								'id' => 8,
								'marker' => [
									[
										'user_id' => 1,
										'x' => 1000,
										'y' => 100,
										'z' => 0,
									],
									[
										'user_id' => 2,
										'x' => 1000,
										'y' => 900,
										'z' => 0,
									],
									[
										'user_id' => 3,
										'x' => 900,
										'y' => 1200,
										'z' => 0,
									],
									[
										'user_id' => 4,
										'x' => 900,
										'y' => 9500,
										'z' => 0,
									],
									[
										'user_id' => 5,
										'x' => 900,
										'y' => 1050,
										'z' => 0,
									],
									[
										'user_id' => 6,
										'x' => 900,
										'y' => 1100,
										'z' => 0,
									],
									[
										'user_id' => 7,
										'x' => -1,
										'y' => -1,
										'z' => -1,
									],
								],
							],
						],
					],
					[
						'id' => 6,
						'subquestions' => [
							[
								'id' => 9,
								'chosen_possibilities' => [
									[
										'user_id' => 1,
										'answer' => [1],
									],
									[
										'user_id' => 2,
										'answer' => [2,3],
									],
									[
										'user_id' => 3,
										'answer' => [1,4],
									],
									[
										'user_id' => 4,
										'answer' => [1,2,4],
									],
									[
										'user_id' => 5,
										'answer' => [1,4],
									],
									[
										'user_id' => 6,
										'answer' => [3,4],
									],
									[
										'user_id' => 7,
										'answer' => [2,4,3],
									],
									[
										'user_id' => 8,
										'answer' => [1,2,3,4],
									],
								],
							],
							[
								'id' => 10,
								//1,2,3
								'chosen_possibilities' => [
									[
										'user_id' => 1,
										'answer' => [1, -1],
									],
									[
										'user_id' => 2,
										'answer' => [1,2,3],
									],
									[
										'user_id' => 3,
										'answer' => [1,2],
									],
									[
										'user_id' => 4,
										'answer' => [1,2],
									],
									[
										'user_id' => 5,
										'answer' => [1,4],
									],
									[
										'user_id' => 6,
										'answer' => [2,4],
									],
									[
										'user_id' => 7,
										'answer' => [2,3],
									],
									[
										'user_id' => 8,
										'answer' => [1,2,3],
									],
								],
							],
							[
								'id' => 99,
								'answers' => [
									[
										'user_id' => 1,
										'answer' => 'Freitext 1',
									],
									[
										'user_id' => 2,
										'answer' => 'Freitext 2^<',
									],
								],
							],
						],
					],
				],
			],
			[
				'id' => 3,
				'title' => 'Kurs: Thorax, Fall 2',
				'number_of_datasets' => 2,
				'created_at' => [
					'timestamp' => 1474274459000,
					'timezone' => 'UTC+2',
				],
			]
		];

	protected $dummyLists = [
		[
			'id' => 1,
			'name' => 'List 1',
			'description' => 'List 1 Description',
			'items' => [
				[
					'id' => 1,
					'name' => 'List 1 Entry 1'
				],
				[
					'id' => 2,
					'name' => 'List 1 Entry 2'
				],
				[
					'id' => 3,
					'name' => 'List 1 Entry 3'
				],
				[
					'id' => 4,
					'name' => 'List 1 Entry 4'
				],
			],
		],
		[
			'id' => 2,
			'name' => 'List 2',
			'description' => 'List 2 Description',
			'items' => [
				[
					'id' => 1,
					'name' => 'List 2 Entry 1'
				],
				[
					'id' => 2,
					'name' => 'List 2 Entry 2'
				],
				[
					'id' => 3,
					'name' => 'List 2 Entry 3'
				],
				[
					'id' => 4,
					'name' => 'List 2 Entry 4'
				],
			],
		],
	];

	public function version(Request $request)
	{
		return response()->json([
			'name' => 'VQuestDummyAPI',
			'version' => $this->version,
		]);
	}

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

	public function image (Request $request, $id)
	{
		// return dummy images
		$dummyImages = [
			1 => 'ser002img00001.jpg',
			2 => 'ser001img00001_.jpg',
			3 => 'ser002img00001_.jpg',
		];

		if (!isset($dummyImages[$id]))
			return response()->json([
				'error' => 'No image with ' . $id . ' found',
			], 404);

		return response()->file(resource_path('assets/images/' . $dummyImages[$id]));
	}

	public function aList (Request $request, $id)
	{
		$list = array_filter($this->dummyLists, function ($list) use ($id) { return $list['id'] == $id; });
		if (empty($list))
			return response()->json([
				'error' => 'No list with ' . $id . ' found',
			], 404);
		return response()->json(array_pop($list));
	}

	private function testToSimple ($test)
	{
		return [
			'id' => $test['id'],
			'title' => $test['title'],
			'number_of_datasets' => $test['number_of_datasets'],
			'created_at' => $test['created_at'],
		];
	}

	private function testToFull ($test)
	{
		return [
			'id' => $test['id'],
			'title' => $test['title'],
			'created_at' => $test['created_at'],
			'groups' => isset($test['answers']) ? $test['groups'] : [],
		];
	}

	private function testToAnswers ($test)
	{
		return isset($test['answers']) ? $test['answers'] : [];
	}

}
