<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Requests\FilterRequest;

use App\Services\AkzentoAPI;
use App\Services\RequestService;

use Cache;

use Auth;

class ApiController extends Controller
{
	public function accountsForLevel(Request $request, $level = null)
	{
		if (is_null($level)) {
			$userModules = Auth::user()->modules;
			$accountsForRootLevel = $userModules->map(function ($module) {
				$accountProvider = config('modules.' . $module->name . '.account-provider');
				if (!$accountProvider) {
					try {
						return AkzentoAPI::getAccounts() ?? [];
					} catch (\Throwable $th) {
						return [];
					}
				}
				return [[
					'id' => $accountProvider . '|',
					'name' =>  trans('modules.' . $accountProvider . '.title'),
					'children' => $this->accountsFromProvider($accountProvider),
				]];
			})->flatten(1);
			$accountsForLevel = $accountsForRootLevel->count() > 1 ? $accountsForRootLevel->values() : $accountsForRootLevel[0]['children'];
		} else {
			$levelWithPrefix = explode('|', $level);
			if (count($levelWithPrefix) > 1) {
				return $this->accountsFromProvider($levelWithPrefix[0], $levelWithPrefix[1]);
			} else {
				try {
					$accountsForLevel = AkzentoAPI::getAccounts($level) ?? [];
				} catch (\Throwable $th) {
					$accountsForLevel = [];
				}
			}
		}
		return response()->json($accountsForLevel);
	}

	public function leavesForLevel(Request $request, $level)
	{
		$levelPrefix = explode('|', $level);
		if (count($levelPrefix) > 1) {
			$leavesForLevel = $this->accountsFromProvider($levelPrefix[0], $levelPrefix[1], true);
		} else {
			try {
				$leavesForLevel = AkzentoAPI::getAccounts($level);
			} catch (\Throwable $th) {
				$leavesForLevel = [];
			}
		}
		return response()->json($leavesForLevel);
	}

	private function accountsFromProvider($module, $level = null, $onlyLeaves = false) {
		$cacheKey = 'module.' . $module . '.accounts.' . $level ?? 'root';
		$accounts = Cache::remember($cacheKey, 60, function () use ($module, $level, $onlyLeaves) {
			$client = new RequestService($module);
			$accountsUrl = config('modules.' . $module . '.routes.accounts');
			if (!empty($accountsUrl)) {
				$params = [];
				if (!empty($level)) {
					$params['level'] = $level;
				}
				if ($onlyLeaves) {
					$params['onlyLeaves'] = true;
				}
				$accountsForLevel = $client->getJson($accountsUrl, $params);
				foreach ($accountsForLevel as &$account) {
					if (!empty($account['isLeave'])) {
						$account['name'] = $account['name'] . ' (' . $account['id'] . ')';
					} else {
						$account['id'] = $module . '|' . $account['id'];
					}
				}
			} else {
				$accountsForLevel = [];
			}
			return $accountsForLevel;
		});
		return $accounts;
	}
}