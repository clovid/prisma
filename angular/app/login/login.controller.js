(function () {
	'use strict';

	angular
		.module('prisma.controllers')
		.controller('LoginController', LoginController);

	LoginController.$inject = ['$log', '$q', '$state', '$stateParams', '$localStorage', 'userService', 'toastFactory', '$mdDialog', 'filterService'];

	function LoginController ($log, $q, $state, $stateParams, $localStorage, userService, toastFactory, $mdDialog, filterService) {
		var vm = this;

		vm.$onInit = function() {
			if (userService.isAuthenticated()) {
				redirect();
			}

			methods();
			variables();
			listeners();
		}

		function methods () {
			vm.submit = submit;
		}

		function variables () { }

		function listeners () {	}

		////////////////

		function redirect () {
			var state = $stateParams.redirect_state;
			if (state === undefined || state === 'login')
				state = 'home';
			$state.go(state);
		}

		function submit (event) {
			vm.error = false;
			vm.loading = true;

			userService.login({login: vm.login, password: vm.password}, {noHttpError: true})
				.catch(function (error) {
					if (angular.isObject(error)) {
						if (error.status === 401)
							vm.error = 'Die Kombination von Kennung und Passwort ist nicht gültig.';
						else if (error.status === 403) {
							vm.error = 'Sie besitzen nicht die notwendigen Berechtigungen, um PRISMA zu verwenden.';
							userService.logout({noHttpError: true});
							showPermissionAlert(event);
						}
						else {
							$log.error('Unknown error while logging in', error);
							vm.error = 'Ein unbekannter Fehler ist aufgetreten. Wenden Sie sich bitte an den Administrator.';
						}
					}
					else
						vm.error = 'Ein unbekannter Fehler ist aufgetreten. Wenden Sie sich bitte an den Administrator.';
					return $q.reject(error);
				})
				.then(function () {
					$localStorage.$reset();
					filterService.resetFilter();
				})
				.then(redirect)
				.finally(function () {
					vm.loading = false;
				});
		}

		function showPermissionAlert (event) {
			$mdDialog.show(
				$mdDialog.alert()
					.clickOutsideToClose(true)
					.title('Fehlende Berechtigungen')
					.htmlContent('Sie verfügen <strong>nicht</strong> über die notwendigen Berechtigungen, um PRISMA zu verwenden.<br/><br/>Wenden Sie sich bitte an den Administrator (pawelka@uni-muenster.de),<br/>wenn Sie entsprechende Berechtigungen erhalten wollen.')
					.ariaLabel('Fehlende Berechtigungen')
					.ok('Okay')
					.targetEvent(event)
			);
		}
	}
})();
