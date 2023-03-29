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
		// TODO: make smarter
		// e.g.: check if some modules allow custom accounts
		// if so -> group into modules and others. Others will contain AkzentoAPI
		// if not return AkzentoAPI
		$userModules = Auth::user()->modules;
		$moduleWithCustomAccounts = 'vquest-online';
		if ($userModules->count() === 1 && $userModules[0]->name === $moduleWithCustomAccounts) {
			if (is_null($level)) {
				$accountsForLevel = [["name" => "VQuest-Online", "id" => $moduleWithCustomAccounts]];
			} else {
				$accountsForLevel = $this->accountsForModule($moduleWithCustomAccounts);
			}
		} else {
			try {
				$accountsForLevel = AkzentoAPI::getAccounts($level);
			} catch (\Throwable $th) {
				$accountsForLevel = [];
			}
		}
		return response()->json($accountsForLevel);
	}

	public function leavesForLevel(Request $request, $level)
	{
		$userModules = Auth::user()->modules;
		$moduleWithCustomAccounts = 'vquest-online';
		if ($userModules->count() === 1 && $userModules[0]->name === $moduleWithCustomAccounts) {
			$leavesForLevel = $this->accountsForModule($moduleWithCustomAccounts);
		} else {
			$leavesForLevel = AkzentoAPI::getLeaves($level);
		}
		return response()->json($leavesForLevel);
	}

	private function accountsForModule($module) {
		if ($module !== 'vquest-online') {
			return [];
		}
		$cacheKey = 'module.' . $module . '.accounts';
		$accounts = Cache::remember($cacheKey, 60, function () use ($module) {
			$client = new RequestService($module);
			$accountsUrl = config('modules.' . $module . '.routes.accounts');
			if (!empty($accountsUrl)) {
				$accountsForLevel = $client->getJson($accountsUrl);
				foreach ($accountsForLevel as &$account) {
					$account['name'] = $account['name'] . ' (' . $account['id'] . ')';
					$account['isLeave'] = true;
				}
			} else {
				$accountsForLevel = [];
			}
			return $accountsForLevel;
		});
		return $accounts;
	}
}