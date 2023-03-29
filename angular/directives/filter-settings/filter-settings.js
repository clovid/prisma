(function () {
	'use strict';

	angular
		.module('prisma.directives')
		.directive('ldFilterSettings', ldFilterSettings);

	ldFilterSettings.$inject = [];

	function ldFilterSettings () {
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
			templateUrl: 'views/directives/filter-settings/filter-settings.html',
			scope: {
			}
		};
		return directive;

		function link (scope, element, attrs) {
		}
	}

	Controller.$inject = ['$log', '$scope', '$rootScope', '$q', '_', '$mdDialog', 'toastFactory', 'accountsService', 'filterService', 'userService', 'generalService'];

	function Controller ($log, $scope, $rootScope, $q, _, $mdDialog, toastFactory, accountsService, filterService, userService, generalService) {
		var vm = this;

		vm.$onInit = function() {
			methods();
			variables();
			listeners();

			initSettings();
		}

		function methods () {
			vm.setFilter = setFilter;
			vm.resetFilter = resetFilter;
			vm.toDateString = toDateString;
		}

		function variables () {
			vm.filterIsSet = false;
			vm.settings = {
				date: undefined,
				timespan: {
					from: 0,
					to: 24 * 60 * 60 * 1000 - (60 * 1000),
				}
			};
			vm.filter = {
				accounts: [],
				date: vm.settings.date,
				timespan: {
					from: vm.settings.timespan.from,
					to: vm.settings.timespan.to,
				},
			};

			generalService.config('privacy').catch(function () {
			  return {};
			}).then(function (privacyConfig) {
				vm.privacyConfig = privacyConfig;
			});

			generalService.config('user').catch(function () {
				return {};
			}).then(function (userConfig) {
				vm.userConfig = userConfig || {};
			});

			vm.maxNumberOfUsers = 150;
		}

		function listeners () {
			vm.unregisterFns = [];
			$scope.$on('$destroy', function() {
				vm.unregisterFns.forEach(function (unregisterFn) { unregisterFn(); });
			});
			vm.unregisterFns.push(
				$rootScope.$on('reset-filter', function(event) {
					vm.filter.date = undefined;
					vm.filter.timespan.from = vm.settings.timespan.from;
					vm.filter.timespan.to = vm.settings.timespan.to;
				}),
				$rootScope.$on('set-filter-from-user-config', function(event) {
					if (!vm.userConfig || !vm.userConfig.filter) {
						toastFactory.show('Kein persönlicher Filter gespeichert');
						return;
					}
					accountsService.resetSelectedAccounts();
					filterService.setRawFilter(vm.userConfig.filter);

					vm.filter.accounts = vm.userConfig.filter.accounts || vm.filter.accounts;
					vm.filter.date = vm.userConfig.filter.date || vm.filter.date;
					vm.filter.timespan.from = (vm.userConfig.filter.timespan && vm.userConfig.filter.timespan.from !== undefined ) ? vm.userConfig.filter.timespan.from : vm.filter.timespan.from;
					vm.filter.timespan.to = (vm.userConfig.filter.timespan && vm.userConfig.filter.timespan.to ) || vm.filter.timespan.to;

					accountsService.loadSelectedAccounts().then(function () {
						setFilter();
						$rootScope.$broadcast('filter-updated-automatically');
					});

				}),
				$rootScope.$on('store-filter-to-user-config', function(event) {
					var rawFilter = filterService.getRawFilter();
					vm.userConfig.filter = rawFilter;
					userService.storeConfig(vm.userConfig).then(function (userConfig) {
						toastFactory.show('Persönlicher Filter wurde gespeichert');
						vm.userConfig = userConfig;
					});
				})
			);
		}

		///////////////////////

		function initSettings () {
			vm.filterIsSet = filterService.isFilterSet();
			var rawFilter = filterService.getRawFilter();
			if (rawFilter !== undefined)
				vm.filter = rawFilter;
		}

		function setFilter () {
			var filter = {
				users: [],
				timespans: [],
			}
			prepareUsersFilter(accountsService.selectedAccounts)
				.then(validateUsersFilter)
				.then(function (users) {
					filter.users = users;
					return prepareTimespansFilter(vm.filter.date, vm.filter.timespan);
				})
				.then(function (timespans) {
					filter.timespans = timespans;
					return filter;
				})
				.then(function (filter) {
					filterService.setFilter(filter);
					vm.filter.accounts = accountsService.getSelectedAccountsAsPath();
					filterService.setRawFilter(vm.filter);
					vm.filterIsSet = true;
				})
				.catch(function (errorMsg) {
					toastFactory.show(errorMsg);
				});
		}

		function resetFilter () {
			filterService.resetFilter();
			vm.filterIsSet = false;
		}

		function toDateString (milliseconds) {
			var hour = getHour(milliseconds);
			var minute = getMinute(milliseconds);
			return ('00' + hour).slice(-2) + ':' + ('00' + minute).slice(-2);
		}

		function getHour (milliseconds) {
			return Math.floor(milliseconds / (60*60*1000));
		}

		function getMinute (milliseconds) {
			return Math.floor((milliseconds % (60*60*1000)) / (60*1000));
		}

		function prepareUsersFilter (accounts) {

			var consolidatedUsers = [];

			// get highest selected parents
			for (var i = accounts.length - 1; i >= 0; i--) {
				var highestSelectedParent = getHighestSelectedParent(accounts[i]);
				if (consolidatedUsers.indexOf(highestSelectedParent) === -1)
					consolidatedUsers.push(highestSelectedParent);
			}

			// get ids of leaves for parents
			var formattedUsers = [];

			var formattedUsersPromises = [];

			for (var i = consolidatedUsers.length - 1; i >= 0; i--) {
				formattedUsersPromises.push(
					getFormattedUser(consolidatedUsers[i]).then(function (user) {
						formattedUsers.push(user);
					})
				);
			}

			return $q.all(formattedUsersPromises).then(function () {
				return formattedUsers;
			});
		}

		function validateUsersFilter (users) {
			var usersCount = _.reduce(users, function (carry, user) {
				return carry + user.cadsIds.length;
			}, 0);
			if (usersCount > 0 && usersCount < vm.privacyConfig.minimum_users_filter)
				return showPrivacyAlert().then(function () {
					return users;
				}).catch(function () {
					return [];
				});
			if (usersCount > vm.maxNumberOfUsers) {
				return $q.reject('Es können maximal ' + vm.maxNumberOfUsers + ' Studierende ausgewählt werden (Aktuell: ' + usersCount + ')');
			}
			return $q.when(users);
		}

		function showPrivacyAlert () {
			var alert = $mdDialog.alert()
				.title('Achtung - Datenschutzverletzung!')
				.htmlContent(
					'Sie haben <strong>weniger als ' + vm.privacyConfig.minimum_users_filter + ' Studierende</strong> ausgewählt.<br>' +
					'Dadurch kann keine Anonymität mehr gewährleistet werden.<br><br>' +
					'<b>Der Filter wird nicht übernommen.</b>'
				)
				.ariaLabel('Datenschutzverletzung')
				.ok('Okay')
			return $mdDialog.show(alert).then(function () {
				return $q.reject();
			});
		}

		function showPrivacyDialog () {
			var confirm = $mdDialog.confirm()
				.title('Achtung - Datenschutzverletzung!')
				.htmlContent(
					'Sie haben <strong>weniger als ' + vm.privacyConfig.minimum_users_filter + ' Studierende</strong> ausgewählt.<br>' +
					'Dadurch kann keine Anonymität mehr gewährleistet werden.<br>' +
					'Bitte holen Sie sich die <b>Einverständniserklärung der betroffenen Personen</b> ein, bevor Sie fortfahren.<br><br>' +
					'<i>Hinweis: Dieser Zugriff wird protokolliert.</i>'
				)
				.ariaLabel('Datenschutzverletzung')
				.ok('Datensätze trotzdem anzeigen')
				.cancel('Filter verwerfen')
			return $mdDialog.show(confirm);
		}

		function getHighestSelectedParent (item) {
			if (item.parent && accountsService.isSelected(item.parent))
				return getHighestSelectedParent(item.parent);
			return item;
		}

		function getFormattedUser (account) {
			var path, semesterName;
			if (account.parent) {
				path = accountsService.getNamePathToAccount(account.parent);
				if (path.length > 1) {
					semesterName = path[1];
				}
				path = path.reverse().join(' < ');
			}
			if (account.isLeave) {
				return $q.when({
					name: account.name,
					semesterName: semesterName,
					path: path,
					cadsIds: [account.id]
				});
			}
			return accountsService.getLeaves(account).then(function (leaves) {
				return {
					name: account.name,
					semesterName: semesterName,
					path: path,
					cadsIds: _.pluck(leaves, 'id'),
				}
			})
		}

		function prepareTimespansFilter(date, timespan) {
			date = new Date(date);
			if (isNaN(date))
				return $q.when([]);
			if (timespan.from >= timespan.to)
				return $q.reject('Zeit-Filer: "von" größer als "bis"');
			return $q.when([
				[
					new Date(date.getFullYear(), date.getMonth(), date.getDate(), getHour(timespan.from), getMinute(timespan.from)),
					new Date(date.getFullYear(), date.getMonth(), date.getDate(), getHour(timespan.to), getMinute(timespan.to)),
				]
			]);
		}
	}
})();
