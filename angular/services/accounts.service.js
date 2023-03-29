(function () {
	'use strict';

	angular
		.module('prisma.services')
		.service('accountsService', accountsService);

	accountsService.$inject = ['$log', '$http', '$q', '$httpOneConcurrentRequestFactory', '_', 'treeService', 'filterService'];

	function accountsService ($log, $http, $q, $httpOneConcurrentRequestFactory, _, treeService, filterService) {
		var vm = this;
		vm.getAccounts = getAccounts;
		vm.loadChildren = loadChildren;
		vm.getLeaves = getLeaves;

		vm.loadSelectedAccounts = loadSelectedAccounts;
		vm.resetSelectedAccounts = resetSelectedAccounts;
		vm.getSelectedAccountsAsPath = getSelectedAccountsAsPath;
		vm.getNamePathToAccount = getNamePathToAccount;

		vm.select = select;
		vm.deselect = deselect;
		vm.expand = expand;
		vm.collapse = collapse;

		vm.isSelected = isSelected;
		vm.isDeselected = isDeselected;
		vm.isInderterminate = isInderterminate;

		vm.accounts = [];
		vm.selectedAccounts = [];

		////////////////

		function getAccounts() {
			if (vm.accounts.length > 0) {
				return $q.resolve(vm.accounts);
			}
			return pGetRoot().then(function (accounts) {
				return vm.accounts = accounts;
			});
		}

		function loadChildren(account) {
			if (!account || account.isLeave) {
				return $q.reject([]);
			}
			if (account.children && account.children.length > 0) {
				return $q.resolve(account.children);
			}
			return pGetChildren(account)
				.then(function (children) {
					if (!angular.isArray(children)) {
						return [];
					}
					return children;
				})
				.then(treeService.setParentOfChildrenFn(account))
				.then(function (children) {
					return account.children = children;
				});
		}

		function getLeaves(account) {
			if (!account.id) {
				return $q.reject({statusText: 'getLeaves: Missing id for account.', status: 400});
			}
			return $http.get('api/account-leaves/' + account.id)
				.catch(function (error) {
					$log.error('Couldn\'t load account leaves', error, id);
					return $q.reject(error);
				})
				.then(function (result) {
					if (!result || !result.data)
						return $q.reject({statusText: 'Error when fetching account leaves.', status: 500});
					return result.data;
				});
		}

		// TODO: shouldn't be public, should be part of getAccounts
		function loadSelectedAccounts() {
			var filter = filterService.getRawFilter();
			if (
				!filter ||
				!filter.accounts ||
				!angular.isArray(filter.accounts) ||
				!filter.accounts.length
			) {
				return $q.resolve();
			}
			return getAccounts() // TODO: could be removed, when part of getAccounts
				.then(function (accountRoots) {
					var loadSelectedAccountsPromises = [];
					for (var i = 0; i < filter.accounts.length; i++) {
						var path = filter.accounts[i].split(',');
						var accountId = path.pop();
						loadSelectedAccountsPromises.push(
							pLoadChildrenForPath(path, accountRoots)
								.then(pSelectChildWithIdFn(accountId))
						)
					}
					return $q.all(loadSelectedAccountsPromises);
				})
				.then(function () {
					_.each(vm.selectedAccounts, pCheckIndeterminationForAncestors);
				});
		}

		function resetSelectedAccounts() {
			vm.selectedAccounts = [];
			treeService.eachRecursive(vm.accounts, function (account) {
				pSetDeselected(account);
			});
		}

		function getSelectedAccountsAsPath() {
			return _.chain(vm.selectedAccounts)
				.map(treeService.getPathToNode)
				.map(function (path) {
					return path.join();
				})
				.value();
		}

		function getNamePathToAccount(account) {
			return treeService.getPropertyPathToNode(account, 'name');
		}

		function select(account) {
			pSelectAccountAndChildren(account);
			pCheckIndeterminationForAncestors(account);
		}

		function deselect(account) {
			pDeselectAccountAndChildren(account);
			pCheckIndeterminationForAncestors(account);
		}

		function expand(account) {
			return loadChildren(account)
				.then(function (children) {
					if (isSelected(account)) {
						_.each(account.children, pSelectAccount);
					}
				});
		}

		function collapse(account) {
			if (isSelected(account)) {
				_.each(account.children, pDeselectAccount);
			}
			return $q.resolve();
		}

		function isSelected(account) {
			return account.status === 'selected';
		}

		function isDeselected(account) {
			return !account.status || account.status === 'deselected';
		}

		function isInderterminate(account) {
			return account.status === 'indeterminate';
		}

		////////////////

		function pGetRoot () {
			return $httpOneConcurrentRequestFactory('api/accounts/').catch(function (error) {
				$log.error('Couldn\'t load accounts (root)', error);
				return $q.reject(error);
			}).then(function (result) {
				if (!result || !result.data) {
					return $q.reject({statusText: 'Error when fetching accounts (root).', status: 500});
				}
				return result.data;
			});
		}

		function pGetChildren(account) {
			if (!account.id) {
				return $q.reject({statusText: 'pGetChildren: Missing id for account.', status: 400});
			}
			return $httpOneConcurrentRequestFactory('api/accounts/' + account.id).catch(function (error) {
				$log.error('Couldn\'t load children for account', error, account);
				return $q.reject(error);
			}).then(function (result) {
				if (!result || !result.data) {
					return $q.reject({statusText: 'Error when fetching accounts.', status: 500});
				}
				return result.data;
			});
		}

		function pLoadChildrenForPath(path, siblings) {
			if (path.length === 0) {
				return $q.resolve(siblings);
			}
			var currentLevel = path.shift();
			var node = _.findWhere(siblings, {id: currentLevel})
			if (!node) {
				return $q.resolve([]);
			}
			return loadChildren(node)
				.then(function (children) {
					return pLoadChildrenForPath(path, children);
				});
		}

		function pSelectChildWithIdFn(id) {
			return function (children) {
				for (var i = children.length - 1; i >= 0; i--) {
					if (children[i].id == id) {
						pSelectAccount(children[i]);
					}
				}
			}
		}

		function pCheckIndeterminationForAncestors(node) {
			if (!node || !node.parent) {
				return;
			}
			var numberOfSelectedChildren = _.filter(node.parent.children, isSelected).length
			var numberOfDeselectedChildren = _.filter(node.parent.children, isDeselected).length
			if (numberOfSelectedChildren === node.parent.children.length) {
				if (!isSelected(node.parent)) {
					pSelectAccount(node.parent);
				}
			} else if (numberOfDeselectedChildren === node.parent.children.length) {
				if (!isDeselected(node.parent)) {
					pDeselectAccount(node.parent);
				}
			} else {
				if (!isInderterminate(node.parent)) {
					pRemoveFromSelectedAccounts(node.parent);
					pSetIndeterminated(node.parent);
				}
			}
			pCheckIndeterminationForAncestors(node.parent);
		}

		function pSelectAccountAndChildren(account) {
			pSelectAccount(account);
			_.each(account.children, pSelectAccountAndChildren);
		}

		function pSelectAccount(account) {
			pSetSelected(account);
			vm.selectedAccounts.push(account);
		}

		function pDeselectAccountAndChildren(account) {
			pDeselectAccount(account);
			_.each(account.children, pDeselectAccountAndChildren);
		}

		function pDeselectAccount(account) {
			pSetDeselected(account);
			pRemoveFromSelectedAccounts(account);
		}

		function pRemoveFromSelectedAccounts(account) {
			vm.selectedAccounts = _.filter(vm.selectedAccounts, function (selectedAccount) {
				return selectedAccount.id !== account.id;
			});
		}

		function pSetSelected(account) {
			if (account) {
				account.status = 'selected';
			}
		}

		function pSetDeselected(account) {
			if (account) {
				account.status = 'deselected';
			}
		}

		function pSetIndeterminated(account) {
			if (account) {
				account.status = 'indeterminate';
			}
		}
	}
})();
