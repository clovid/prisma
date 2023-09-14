<?php

/**
 * Temporary place for modules config. Better in DB.
 */

return [
	'medforge' => [
		'routes' => [
			'tasks' => 'tasks',
			'tasks-count-datasets' => 'count/tasks',
			'task-count-datasets' => 'count/tasks/{id}',
		],
		'aggregation-service' => [
			'type' => 'url',
			'value' => config('services.medforge.base-url') . 'aggregate',
			'null-string' => '---',
		],
		// 'aggregation-service' => [
		// 	'type' => 'class',
		// 	'value' => App\Services\MedForGeService::class
		// ],
		'tab-service' => [
			'type' => 'dynamic',
			'value' => App\Services\MedforgeTabCollector::class,
			'tab-structure' => [
				[
					'name' => 'anamnesis',
					'title' => 'Anamnese',
				],
				[
					'name' => 'diagnoses',
					'title' => 'Diagnosen',
				],
				[
					'name' => 'laboratory',
					'title' => 'Labor',
				],
				[
					'name' => 'therapy',
					'title' => 'Therapie',
				],
				[
					'name' => 'additional',
					'template' => 'default',
					'title' => 'Zusätzliche Informationen',
				],
			],
		],
		/**
		 * Schema:
		 * - tab (required)
		 * 	- group (optional)
		 * 		- element (required)
		 * 			- type (optional): frequency (default) | frequency distribution | grouped frequency distribution | free text | free text compare
		 * 			- title (optional)
		 * 			- source (required): string | array
		 * 			- sourceType (optional): string (default) | boolean
		 * 			- hierarchy (optional): needed for grouped frequency distribution
		 */
		'tab-config' => [
			/**
			 * Read it like this:
			 * The tab (or high-level-group) 'anamnesis' contains
			 * one element also called 'anamnesis'. We know that this
			 * is an element, because it contains 'source'.
			 * This element is a free-text so it simply lists all values.
			 */
			'anamnesis' => [
				'anamnesis' => [
					'source' => 'anamnesis.anamnesis',
					'type' => 'free-text',
				],
			],
			/**
			 * Read it like this:
			 * The tab 'diagnoses' contains four elements. All elements
			 * are frequency-distributions, which means that they collect
			 * all values from the 'source' field and return a list of
			 * unique values including its frequency. It is also possible
			 * to define more than one 'source' (see 'laboratory => edta').
			 */
			'diagnoses' => [
				'before' => [
					'type' => 'frequency-distribution',
					'title' => 'Diagnose "Zustand nach (Z)"',
					'source' => 'diagnosis.before'
				],
				'exclusion' => [
					'type' => 'frequency-distribution',
					'title' => 'Diagnose "Ausschluss von (A)"',
					'source' => 'diagnosis.exclusion'
				],
				'suspected' => [
					'type' => 'frequency-distribution',
					'title' => 'Diagnose "Verdacht (V)"',
					'source' => 'diagnosis.suspected'
				],
				'confirmed' => [
					'type' => 'frequency-distribution',
					'title' => 'Diagnose "Gesichert (G)"',
					'source' => 'diagnosis.confirmed'
				],
			],
			'laboratory' => [
				/**
				 * Read it like this:
				 * The element 'urgent' contains the frequency (default)
				 * of the 'source' field 'laboratory.field1', so it just
				 * counts the values for this field.
				 */
				'urgent' => 'laboratory.field1',
				/**
				 * Read it like this:
				 * The element 'edta' contains a frequency-distribution
				 * of multiple 'source' fields, which means, that the values
				 * of multiple fields are merged and the frequency-distribution
				 * is calculated for the whole group.
				 * The sourceType 'boolean' means, that not the values of the
				 * 'source' fields are used for the frequency-distribution but
				 * the titles of the 'source' fields. Because 'source' fields with
				 * the type 'boolean' have only two values: 'true' or 'false'.
				 * Since we don't want to count the frequencies of 'true' and 'false'
				 * selections in the 'source' fields, we have to specify the sourceType
				 * as 'boolean'.
				 */
				'edta' => [
					'type' => 'frequency-distribution',
					'title' => 'EDTA',
					'source' => [
						'laboratory.field2',
						'laboratory.field3',
						'laboratory.field4',
						'laboratory.field5',
						'laboratory.field6',
						'laboratory.field7',
					],
					'sourceType' => 'boolean',
				],
				'citrat' => [
					'type' => 'frequency-distribution',
					'title' => 'Citrat',
					'source' => [
						'laboratory.field9',
						'laboratory.field10',
						'laboratory.field11',
						'laboratory.field12',
					],
					'sourceType' => 'boolean',
				],
				'wholeBlood' => [
					'type' => 'frequency-distribution',
					'title' => 'Serum Vollblut',
					'source' => [
						'laboratory.field13',
						'laboratory.field14',
						'laboratory.field15',
						'laboratory.field16',
						'laboratory.field17',
						'laboratory.field18',
						'laboratory.field19',
						'laboratory.field20',
						'laboratory.field21',
						'laboratory.field22',
						'laboratory.field23',
						'laboratory.field24',
						'laboratory.field25',
						'laboratory.field26',
						'laboratory.field27',
						'laboratory.field28',
						'laboratory.field29',
						'laboratory.field30',
						'laboratory.field31',
						'laboratory.field32',
						'laboratory.field33',
						'laboratory.field34',
						'laboratory.field35',
						'laboratory.field36',
						'laboratory.field37',
						'laboratory.field38',
						'laboratory.field39',
						'laboratory.field40',
						'laboratory.field41',
						'laboratory.field42',
						'laboratory.field43',
						'laboratory.field44',
						'laboratory.field45',
						'laboratory.field46',
						'laboratory.field47',
						'laboratory.field48',
						'laboratory.field49',
						'laboratory.field50',
					],
					'sourceType' => 'boolean',
				],
				'glucose' => [
					'type' => 'frequency-distribution',
					'title' => 'Glukose',
					'source' => [
						'laboratory.field51',
						'laboratory.field52',
						'laboratory.field53',
						'laboratory.field54',
					],
					'sourceType' => 'boolean',
				],
				'urine' => [
					'type' => 'frequency-distribution',
					'title' => 'Urin',
					'source' => [
						'laboratory.field55',
						'laboratory.field56',
						'laboratory.field57',
						'laboratory.field58',
						'laboratory.field59',
						'laboratory.field60',
					],
					'sourceType' => 'boolean',
				],
				'inHouseDiagnostics' => [
					'type' => 'frequency-distribution',
					'title' => 'Praxisinterne Diagnostik',
					'source' => [
						'inHouseDiagnostics.ihdField1',
						'inHouseDiagnostics.ihdField2',
						'inHouseDiagnostics.ihdField3',
						'inHouseDiagnostics.ihdField4',
						'inHouseDiagnostics.ihdField5',
						'inHouseDiagnostics.ihdField6',
						'inHouseDiagnostics.ihdField7',
						'inHouseDiagnostics.ihdField8',
						'inHouseDiagnostics.ihdField9',
						'inHouseDiagnostics.ihdField10',
						'inHouseDiagnostics.ihdField11',
						'inHouseDiagnostics.ihdField12',
						'inHouseDiagnostics.ihdField13',
						'inHouseDiagnostics.ihdField14',
						'inHouseDiagnostics.ihdField15',
						'inHouseDiagnostics.ihdField16',
						'inHouseDiagnostics.ihdField17',
						'inHouseDiagnostics.ihdField18',
						'inHouseDiagnostics.ihdField19',
						'inHouseDiagnostics.ihdField20',
						'inHouseDiagnostics.ihdField21',
						'inHouseDiagnostics.ihdField22',
						'inHouseDiagnostics.ihdField23',
						'inHouseDiagnostics.ihdField24',
						'inHouseDiagnostics.ihdField25',
					],
					'sourceType' => 'boolean',
				],
			],
			/**
			 * Read it like this:
			 * The tab 'therapy' contains the element 'drugs' and three
			 * groups: 'incapacityCertificate', 'referral' and 'hospital'.
			 */
			'therapy' => [
				'drugs' => [
					/**
					 * Read it like this:
					 * We have a group "drugs" with the title "Wirkstoffe".
					 * This group contains a grouped-frequency-distribution, which means
					 * that you have the frequency-distribution of multiple items:
					 * drug, dosis and intake. They are ordered as hierarchy, so for one value
					 * of an item you can open the values of the next item. The current
					 * hierarchy is drug => dosis => intake, which means, that you first see
					 * all different values of 'drug' (collected from the fields drug0, drug1,
					 * drug2) including its frequency. For each value of 'drug' you can open a
					 * subgroup which contains all 'dosis' values for this specifc 'drug' value
					 * including its frequeny.
					 *
					 * The difficulty here is in the calculation process we need to keep the
					 * relation of the fields, in this case:
					 * drug0 => dosis0 => intake0,
					 * drug1 => dosis1 => intake1,
					 * drug2 => dosis2 => intake2
					 *
					 * So every group (drug, dosis and intake) must have the same number of 'source'
					 * fields AND must be listed in the correct order.
					 */
					'type' => 'grouped-frequency-distribution',
					'title' => 'Wirkstoffe',
					'source' => [
						'drug' => [
							'prescription.drug0',
							'prescription.drug1',
							'prescription.drug2',
						],
						'dosis' => [
							'prescription.dosis0',
							'prescription.dosis1',
							'prescription.dosis2',
						],
						'intake' => [
							'prescription.intake0',
							'prescription.intake1',
							'prescription.intake2',
						],
					],
					'hierarchy' => [
						'drug' => 'Wirkstoff',
						'dosis' => 'Dosis',
						'intake' => 'Einnahme',
					],
				],
				'narcoticDrugs' => [
					'type' => 'grouped-frequency-distribution',
					'title' => 'Wirkstoffe',
					'source' => [
						'drug' => [
							'btm.drug0',
						],
						'dosis' => [
							'btm.dosis0',
						],
						'flags' => [
							'btm.flag0',
						],
						'directions' => [
							'btm.directions0',
						],
					],
					'hierarchy' => [
						'drug' => 'Wirkstoff',
						'dosis' => 'Dosis',
						'flags' => 'Besondere Kennzeichnung',
						'directions' => 'Gebrauchsanweisung',
					],
				],
				'incapacityCertificate' => [
					'type' => [
						'type' => 'frequency-distribution',
						'title' => 'Art',
						'source' => [
							'incapacityCertificate.first',
							'incapacityCertificate.second',
						],
						'sourceType' => 'boolean',
					],
					// 'workAccident' => 'incapacityCertificate.workAccident',
					// 'medicalReferee' => [
					// 	'source' => 'incapacityCertificate.medicalReferee',
					// 	'title' => 'Dem Durchgangsarzt zugewiesen',
					// ],
					'duration' => [
						'type' => 'frequency-distribution',
						'source' => 'incapacityCertificate.duration',
					],
					// 'diagnoses' => [
					// 	'type' => 'frequency-distribution',
					// 	'title' => 'AU-begründende Diagnose',
					// 	'source' => [
					// 		'incapacityCertificate.diagnose0',
					// 		'incapacityCertificate.diagnose1',
					// 		'incapacityCertificate.diagnose2',
					// 		'incapacityCertificate.diagnose3',
					// 		'incapacityCertificate.diagnose4',
					// 		'incapacityCertificate.diagnose5',
					// 	],
					// ],
				],
				'referral' => [
					'to' => [
						'type' => 'frequency-distribution',
						'source' => 'referralSpecialist.referralTo'
					],
					// 'diagnoses' => [
					// 	'type' => 'frequency-distribution',
					// 	'title' => 'Diagnose',
					// 	'source' => [
					// 		'referralSpecialist.diagnose',
					// 		'referralSpecialist.suspectedDiagnose',
					// 	],
					// ],
					// 'type' => [
					// 	'type' => 'frequency-distribution',
					// 	'title' => 'Art',
					// 	'source' => [
					// 		'referralSpecialist.service',
					// 		'referralSpecialist.council',
					// 		'referralSpecialist.treatment',
					// 	],
					// 	'sourceType' => 'boolean',
					// ],
				],
				'hospital' => [
					'emergency' => 'referralHospital.emergency',
				],
			],
			'additional' => [
				'questions' => [
					[
						'title' => 'Entlassbrief',
						'source' => 'medicalReport.medicalReport',
						'type' => 'free-text-compare',
						'questionType' => 'open-compare',
					]
				],
				// 'questions' => [
				// 	'type' => 'dynamic-questions',
				// 	'title' => 'SP-Feedback',
				// 	'source' => 'anamnesis.externalSurveyId',
				// 	'sourceType' => 'survey',
				// ],
			],
		],
	],

	'vquest' => [
		'routes' => [
			'tasks' => 'tests',
			'tasks-count-datasets' => 'tests/count-datasets',
			'task-count-datasets' => 'tests/{id}/count-datasets',
		],
		/**
		 * OPTIONAL
		 * Module specific filter mapping.
		 * Here: VQuest excpects 'user_ids' and not 'cads_ids', so we map them.
		 */
		'filter' => [
			'cads_ids' => 'user_ids',
		],
		'aggregation-service' => [
			'type' => 'class',
			'value' => App\Services\VQuestAggregator::class,
			'null-string' => '---',
		],
		'tab-service' => [
			'type' => 'dynamic',
			'value' => App\Services\VQuestAggregator::class,
			'default-tab-template' => 'default-with-image',
		],
		'cache' => [
			'test' => [
				'duration' => 0 // in seconds, 0: forever
			],
			'list' => 0,
			'image' => 0,
			'overlay' => 0,
		],
		'transform' => [
			'subquestion-title' => [
				'(Mehrfachantworten möglich)' => '',
			],
		],
		'tab-config' => [],
	],

	'vquest-online' => [
		'routes' => [
			'tasks' => 'tests',
			'tasks-count-datasets' => 'tests/count-datasets',
			'task-count-datasets' => 'tests/{id}/count-datasets',
			'accounts' => 'candidates',
		],
		/**
		 * OPTIONAL
		 * Module specific filter mapping.
		 * Here: VQuest excpects 'user_ids' and not 'cads_ids', so we map them.
		 */
		'filter' => [
			'cads_ids' => 'user_ids',
		],
		'aggregation-service' => [
			'type' => 'class',
			'value' => App\Services\VQuestOnlineAggregator::class,
			'null-string' => '---',
		],
		'tab-service' => [
			'type' => 'dynamic',
			'value' => App\Services\VQuestOnlineAggregator::class,
			'default-tab-template' => 'default-with-image',
		],
		'cache' => [
			'test' => [
				'duration' => 0 // in seconds, 0: forever
			],
			'list' => 0,
			'token' => 10,
		],
		'transform' => [
			'subquestion-title' => [
				'(Mehrfachantworten möglich)' => '',
			],
		],
		'tab-config' => [],
		'pixel' => env('OMERO_API_URL') ? env('OMERO_API_URL') . 'webclient/' : null,
		'account-provider' => 'vquest-online',
	],

	'campus' => [
		'routes' => [
			'tasks' => 'cases',
			'tasks-count-datasets' => 'cases/count-datasets',
			'task-count-datasets' => 'cases/{id}/count-datasets',
		],
		'filter' => [
			'cads_ids' => 'user_ids',
		],
		'aggregation-service' => [
			'type' => 'class',
			'value' => App\Services\CampusAggregator::class,
			'null-string' => '---',
		],
		'tab-service' => [
			'type' => 'dynamic',
			'value' => App\Services\CampusTabCollector::class,
			'default-tab-template' => 'default',
		],
		'tab-config' => [],
		'tab-titles' => [
			'anamnesis' => 'Anamnese',
			'physical_examination' => 'Körp. Untersuchung',
			'laboratory' => 'Labor',
			'diagnoses' => 'Diagnosen',
			'therapy' => 'Therapie',
			'technical_examination' => 'Techn. Untersuchung',
			'additional_content' => 'Zusätzliche Fragen',
		],
		'default-tab-title' => 'Karte',
	],
];
