<?php

namespace App\Services;

use Log;
use Cache;

/**
* @author Friedrich Pawelka <friedrich.pawelka@googlemail.com>
*/
class AkzentoAPI
{
	/**
	 * Interfaces to communicate with Akzento
	 * @var array
	 */
	protected static $api = [
		/**
		 * Interface to get the semester structure
		 */
		'semesters' => 'filter.php',
	];

	protected static $timeToCache = 60 * 60; // in seconds

	protected static $cacheKeys = [
		'accounts' => 'accounts.', // + Level
	];

	/**
	 * Checks if for the level string children are cached. If not, build the cache for the level. Then return the created cached entry.
	 * @param  string $level all levels concated by '.'
	 * @return array
	 */
	public static function getAccounts($level = null)
	{
		if (empty(static::activatedAccountGroups()))
			return [];

		if (!Cache::has(static::cacheKeyAccounts($level)))
			static::buildAccountsCache($level);

		$accounts = Cache::get(static::cacheKeyAccounts($level));
		if (is_null($accounts))
			Log::error('API-Service: Error when caching the accounts ', ['level' => $level]);

		return $accounts;
	}

	/**
	 * Goes down the accounts tree beginning at $level and collects all the leaves
	 * @param  string $level all levels concated by '.'
	 * @return array
	 */
	public static function getLeaves($level)
	{
		if (empty(static::activatedAccountGroups()))
			return [];

		$children = static::getAccounts($level);
		if (is_null($children))
			return [];
		$leaves = [];
		foreach ($children as $child) {
			if (isset($child['isLeave']) && $child['isLeave'])
				$leaves[] = $child;
			else
				$leaves = array_merge($leaves, static::getLeaves($child['id']));
		}
		return $leaves;
	}

	/**
	 * Handles, which accounts cache has to be build. If we only need the root or the first level then we build the Root accounts cache. Otherwise we need to build the semester accounts cache.
	 * @param  string $level all levels concated by '.'
	 * @return bool
	 */
	protected static function buildAccountsCache ($level = null)
	{
		$levels = explode('.', $level);
		if (count($levels) <= 1)
			return static::buildRootAccountsCache();
		if (count($levels) <= 3)
			return static::buildSemesterAccountsCache($levels);
		return false;
	}

	/**
	 * Adapter method for akzento response. Seperates the two levels of the root hierarchy and puts them into the cache.
	 * @return bool
	 */
	protected static function buildRootAccountsCache ()
	{
		$client = new RequestService('akzento');
		$rawAccounts = $client->getJson(static::$api['semesters']);

		$studyPaths = [];

		foreach ($rawAccounts as $id => $value) {
			if (!isset($value['teilnehmer'])) {
				$studyPath = [
					'name' => $value['sonstiges']['name'] . '-' . $value['sonstiges']['parameter']['teilnehmer'],
					'semesters_id' => (int) $value['sonstiges']['parameter']['semester_id'],
					'id' => $value['sonstiges']['parameter']['teilnehmer'],
				];
			} else {
				$studyPath = [
					'name' => $value['teilnehmer']['name'],
					'semesters_id' => (int) $value['teilnehmer']['parameter']['semester_id'],
					'id' => $value['teilnehmer']['parameter']['teilnehmer'],
				];
			}

			if (!in_array($studyPath['id'], static::activatedAccountGroups()))
				continue;

			$studyPaths[] = $studyPath;

			$semesters = [];
			if (isset($value['semester'])) {
				foreach ($value['semester'] as $id => $semester) {
					$semesters[] = [
						'name' => $semester['name'],
						'id' => implode('.', [$studyPath['id'], $id]), // use reference of study path to create unique id and to implicite define depth
					];
				}
			}

			// Add others that are not in a specific semester
			if (isset($value['sonstiges']) && !empty($value['sonstiges']))
				$semesters[] = [
					'name' => 'Sonstige',
					'id' => implode('.', [$studyPath['id'], 0]),
				];
			Cache::put(static::cacheKeyAccounts($studyPath['id']), $semesters, static::$timeToCache);
		}
		Cache::put(static::cacheKeyAccounts(), $studyPaths, static::$timeToCache);

		return true;
	}

	/**
	 * Adapter method for akzento response. Seperates the two levels of the semester hierarchy and puts them into the cache.
	 * @param  array $levels with at least level 1 (at $levels[0]) and level 2 (at $levels[1])
	 * @return bool
	 */
	protected static function buildSemesterAccountsCache ($levels)
	{
		$studyId = $levels[0];

		foreach (static::getAccounts() as $studyPath) {
			if ($studyPath['id'] === $studyId)
				$semestersId = $studyPath['semesters_id'];
		}
		if (!isset($semestersId)) {
			Log::error('API-Service: It seems that a study path with ID ' . $studyId . ' does not exist.');
			return false;
		}

		$client = new RequestService('akzento');
		$parameter = [
			'teilnehmer' => $studyId,
			'semester_id' => $semestersId, //returns all semester from the study path
		];

		$rawAccounts = $client->getJson(static::$api['semesters'], $parameter);

		foreach ($rawAccounts as $semesterId => $semesterGroups) {
			if ($semesterId === 0)
				static::buildPersons($semesterGroups, implode('.', [$studyId, $semesterId]));
			else
				static::buildGroups($semesterGroups, implode('.', [$studyId, $semesterId]));
		}

		return true;
	}

	protected static function buildGroups ($rawGroups, $cacheKey)
	{
		$groups = [];
		foreach ($rawGroups as $groupId => $accounts) {
			$group = [
				'name' => mb_strtoupper($groupId),
				'id' => implode('.', [$cacheKey, $groupId]),
			];
			$groups[] = $group;

			static::buildPersons($accounts, $group['id']);
		}
		Cache::put(static::cacheKeyAccounts($cacheKey), $groups, static::$timeToCache);

	}

	protected static function buildPersons ($rawAccounts, $cacheKey)
	{
		$accounts = [];
		foreach ($rawAccounts as $accountId => $account) {
			$account = static::buildPerson($account);
			if (is_null($account))
				continue;
			$accounts[] = $account;
		}
		Cache::put(static::cacheKeyAccounts($cacheKey), $accounts, static::$timeToCache);
	}

	protected static function buildPerson ($rawAccount)
	{

		if (!isset($rawAccount['app_user_id'])) {
			Log::error('API-Service: There is an account with no app_user_id.', [
				'rawAccount' => $rawAccount,
			]);
			return;
		}

		if (!isset($rawAccount['vorname']) || !isset($rawAccount['nachname']) || !isset($rawAccount['cads_id'])) {
			Log::warning('API-Service: There is an account with no name or cads_id! We skip it for now.', [
				'app_user_id' => $rawAccount['app_user_id'],
				'group' => $rawAccount['gruppe'],
				'semester' => $rawAccount['semester'],
			]);
			return;
		}

		if (!isset($rawAccount['ilias_id'])) {
			Log::warning('API-Service: There is an account with no ilias id!', [
				'app_user_id' => $rawAccount['app_user_id'],
			]);
		}
		return [
			'name' => $rawAccount['vorname'] . ' ' . $rawAccount['nachname'],
			'iliasId' => isset($rawAccount['ilias_id']) ? $rawAccount['ilias_id'] : null,
			'id' => $rawAccount['cads_id'],
			'isLeave' => true,
		];
	}

	protected static function cacheKeyAccounts($level = null)
	{
		return static::$cacheKeys['accounts'] . $level;
	}

	protected static function activatedAccountGroups()
	{
		return config('services.akzento.activated-groups', []);
	}
}
