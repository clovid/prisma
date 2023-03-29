(function () {
	'use strict';

	angular
		.module('prisma.controllers')
		.controller('AdminUsersController', AdminUsersController);

	AdminUsersController.$inject = ['$log', '_', '$localStorage', 'toastFactory', '$mdDialog', 'usersService'];

	function AdminUsersController ($log, _, $localStorage, toastFactory, $mdDialog, usersService) {
		var vm = this;


		vm.$onInit = function() {
			methods();
			variables();
			applyFilter();
		}

		// All public methods of this controller
		function methods () {
			vm.applyFilter = applyFilter;
			vm.queryModules = usersService.modules;

			// Action methods
			vm.editModules = editModules;
			vm.editModulesMultiple = editModulesMultiple;

			vm.toggle = toggle;

			vm.create = createUser;
			vm.destroy = destroyUser;
		}

		// All public variables of this controller
		function variables () {
			vm.selected = [];
			vm.queriedUsers = [];
			vm.settings = {
				order: 'login',
			};
			vm.pagination = {
				limit: 10,
				page: 1,
			};
			vm.counts = usersService.counts;
			vm.filter = pInitFilter();
		}

		//////////////////////
		/// Public methods ///
		//////////////////////

		/**
		 * Persists the filters and starts a query.
		 * @return {promise}
		 */
		function applyFilter () {
			pPersistFilter(vm.filter);
			return pQuery(vm.filter);
		}

		/**
		 * Opens a dialog to select the modules of a user.
		 * The current modules of the user are preselected.
		 * Syncs the selected ones with the server via the users service.
		 * Toasts a success message.
		 * @param  {DOMClickEvent} event of the click
		 * @param  {Object} user
		 * @return {promise}
		 */
		function editModules (event, user) {
			return $mdDialog.show(pModulesDialog(event, user.modules)).then(function (modules) {
				return usersService.updateModules(user, modules);
			}).then(function () {
				toastFactory.show('Modulezugriff wurde aktualisiert');
			}).catch(function (error) {
				if (error !== undefined) {
					$log.error('Unknown error when editing module of user', error);
				}
			});
		}

		/**
		 * Opens a dialog to select the modules of multiple users.
		 * NO modules are preselected.
		 * Syncs the selected ones with the server via the users service.
		 * Toasts a success message or a list of users where the modules
		 * could not be updated.
		 * @param  {DOMClickEvent} event of the click
		 * @param  {List} users
		 * @return {promise}
		 */
		function editModulesMultiple (event, users) {
			return $mdDialog.show(pModulesDialog(event)).then(function (modules) {
				return usersService.updateModulesMultiple(users, modules);
			}).then(function (failedUsers) {
				if (failedUsers.length > 0) {
					var logins = _.pluck(failedUsers, 'login');
					if (logins.length === 1)
						return toastFactory.show('Für den Benutzer ' + logins[0] + ' konnte der Modulezugriff nicht aktualisiert werden.');
					if (logins.length === 2)
						return toastFactory.show('Für die Benutzer ' + logins.join('" und "') + ' konnte der Modulezugriff nicht aktualisiert werden.');
					return toastFactory.show('Für den Benutzer "' + logins[0] + '" und ' + _.rest(logins).length + ' weitere konnte der Modulezugriff nicht aktualisiert werden.');
				}
				return toastFactory.show('Modulezugriff wurde aktualisiert.');
			}).catch(function (error) {
				if (error !== undefined) {
					$log.error('Unknown error when editing module of users', error);
				}
			});
		}

		function toggle (event, user, property) {
			user[property] = !user[property];
			return usersService.update(user)
				.catch(function (error) {
					if (error !== undefined) {
						$log.error('Unknown error when updating users', error);
					}
				})
				.then(function (user) {
					return toastFactory.show('Benutzer wurde aktualisiert.');
				}).catch(function () {});
		}

		/**
		 * Opens a dialog to create a new user.
		 * If succeed it returns the created user, shows a message and reload the users list.
		 * @param  {DOMClickEvent} event of the click
		 * @return {promise}
		 */
		function createUser (event) {
			return $mdDialog.show(pUserDialog(event)).then(function (user) {
				toastFactory.show('Benutzer ' + user.login + ' wurde erstellt.');
				return pQuery(vm.filter, true);
			}).catch(function (error) {
				if (error !== undefined) {
					$log.error('Unknown error when creating a new user', error);
				}
			});
		}

		/**
		 * Destroys the user from the server after getting confirmation.
		 * @param  {DOMClickEvent} event of the click
		 * @param  {Object} user
		 * @return {promise}
		 */
		function destroyUser (event, user) {
			var confirm = $mdDialog.confirm()
				.title('Benutzer löschen')
				.textContent('Möchten Sie den gewählten lokalen Benutzer wirklich löschen?')
				.ariaLabel('Benutzer löschen')
				.targetEvent(event)
				.ok('Benutzer löschen')
				.cancel('Abbrechen');

			return $mdDialog.show(confirm).then(function () {
				return usersService.destroy(user);
			})
			.then(function () {
				toastFactory.show('Benutzer ' + user.login + ' wurde gelöscht.');
				return pQuery(vm.filter, true);
			}).catch(function (error) {
				if (error !== undefined) {
					$log.error('Unknown error when destroying user', error);
				}
			});
		}

		///////////////////////
		/// Private methods ///
		///////////////////////

		/**
		 * Filters the users on the server and updates the page (if necessary).
		 * @param  {Object} filter { name: String, modules: [] }
		 * @param {bool|null} force a server query, defaults to false
		 * @return {promise}
		 */
		function pQuery (filter, force) {
			return usersService.index(filter, force).then(function (users) {
				vm.queriedUsers = users;
				if (vm.queriedUsers.length <= (vm.pagination.page - 1) * vm.pagination.limit)
					vm.pagination.page = Math.ceil(vm.queriedUsers.length / vm.pagination.limit) || 1;
				return vm.queriedUsers;
			}).catch(function (error) {
				$log.error('Querying users failed!', error);
			});
		}

		/**
		 * Initialized the filters from the local storage
		 * @return  {Object} filter { name: String, modules: [] }
		 */
		function pInitFilter () {
			return {
				name: $localStorage.filterUsersName || '',
				modules: $localStorage.filterUsersModules || [],
			}
		}

		/**
		 * Persists the filters in the local storage
		 * @param  {Object} filter { name: String, modules: [] }
		 * @return {undefined}
		 */
		function pPersistFilter (filter) {
			$localStorage.filterUsersName = filter.name;
			$localStorage.filterUsersModules = filter.modules;
		}

		/**
		 * Creates a custom dialog for the selection of modules.
		 * Preselects the selected modules.
		 * @param  {DOMClickEvent} event of the click
		 * @param  {List} selectedModules
		 * @return {Object} config for $mdDialog.show
		 */
		function pModulesDialog (event, selectedModules) {
			if (!selectedModules)
				selectedModules = [];
			return {
				controller: 'ModulesDialogController',
				controllerAs: 'vm',
				locals: {
					modules: usersService.modules(),
					selectedModules: selectedModules,
				},
				bindToController: true,
				templateUrl: 'views/app/admin-users/modules-dialog.html',
				parent: angular.element(document.body),
				targetEvent: event,
				clickOutsideToClose: true
			}
		}

		/**
		 * Creates a custom dialog for the creation of a new user.
		 * Provides the available modules.
		 * @param  {DOMClickEvent} event of the click
		 * @return {Object} config for $mdDialog.show
		 */
		function pUserDialog (event) {
			return {
				controller: 'UserDialogController',
				controllerAs: 'vm',
				locals: {
					modules: usersService.modules(),
				},
				bindToController: true,
				templateUrl: 'views/app/admin-users/user-dialog.html',
				parent: angular.element(document.body),
				targetEvent: event,
				clickOutsideToClose: true
			}
		}
	}
})();
