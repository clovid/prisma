(function () {
	'use strict';

	angular
		.module('prisma.directives')
		.directive('ldAccountsTree', ldAccountsTree);

	ldAccountsTree.$inject = [];

	function ldAccountsTree () {
		// Usage:
		//
		// Creates:
		//
		var directive = {
			bindToController: true,
			controller: Controller,
			controllerAs: 'vm',
			link: link,
			restrict: 'A',
			templateUrl: 'views/directives/accounts-tree/accounts-tree.html',
			scope: { },
		};
		return directive;

		function link (scope, element, attrs) {
		}
	}

	Controller.$inject = ['$log', '$scope', '$rootScope', '_', '$q', 'accountsService'];

	function Controller ($log, $scope, $rootScope, _, $q, accountsService) {

		var vm = this;

		vm.$onInit = function() {
			methods();
			variables();
			listeners();
		}

		function methods () {
			vm.toggleSelection = toggleSelection;
			vm.toggleExpansion = toggleExpansion;
			vm.isSelected = accountsService.isSelected;
			vm.isDeselected = accountsService.isDeselected;
			vm.isInderterminate = accountsService.isInderterminate;
		}

		function variables () {
			accountsService.getAccounts().then(function (accounts) {
				vm.accounts = accounts;
				return accountsService.loadSelectedAccounts();
			}).then(expandLoadedChildren);
		}

		function listeners () {
			vm.unregisterFns = [];
			$scope.$on('$destroy', function() {
				vm.unregisterFns.forEach(function (unregisterFn) { unregisterFn(); });
			});
			vm.unregisterFns.push(
				$rootScope.$on('reset-filter', function(event) {
					accountsService.resetSelectedAccounts();
				}),
				$rootScope.$on('filter-updated-automatically', function(event) {
					expandLoadedChildren();
				})
			);
		}

		///////////////////////

		function toggleSelection (account) {
			if (account === undefined)
				return;
			if (vm.isSelected(account) || vm.isInderterminate(account)) {
				deselect(account);
			} else {
				select(account);
			}
		}

		function toggleExpansion(account) {
			if (account === undefined)
				return;
			if (!account.expanded)
				expand(account);
			else
				collapse(account);
		}

		function expand(account) {
			accountsService.expand(account)
				.then(function () {
					account.expanded = true;
				});
		}

		function collapse(account) {
			accountsService.collapse(account)
				.then(function() {
					account.expanded = false;
				});
		}

		function deselect(account) {
			if (vm.isDeselected(account)) {
				return;
			}
			accountsService.deselect(account);
		}

		function select(account) {
			if (vm.isSelected(account)) {
				return;
			}
			accountsService.select(account);
		}

		function expandLoadedChildren() {
			_.each(vm.accounts, expandLoadedChildrenHelper);
		}

		function expandLoadedChildrenHelper(currentAccount) {
			if (!currentAccount.isLeave &&
				currentAccount.children &&
				currentAccount.children.length &&
				accountsService.isInderterminate(currentAccount)
			) {
				currentAccount.expanded = true;
				_.each(currentAccount.children, expandLoadedChildrenHelper);
			}
		}
	}
})();
