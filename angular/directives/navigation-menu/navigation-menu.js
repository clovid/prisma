(function () {
	'use strict';

	angular
		.module('prisma.directives')
		.directive('ldNavigationMenu', ldNavigationMenu);

	ldNavigationMenu.$inject = [];

	function ldNavigationMenu () {
		// Usage:
		//
		// Creates:
		//
		var directive = {
			bindToController: true,
			controller: Controller,
			controllerAs: 'vm',
			restrict: 'A',
			templateUrl: 'views/directives/navigation-menu/navigation-menu.html',
		};
		return directive;
	}

	Controller.$inject = ['$rootScope', '$log', '$q', '$state', '$translate', 'userService'];

	function Controller ($rootScope, $log, $q, $state, $translate, userService) {
		var vm = this;

		vm.$onInit = function() {
			userService.user().then(function (user) {
				vm.user = user;
			});

			$rootScope.$on('$translateChangeSuccess', function () {
				vm.lang = $translate.use();
			});

			vm.logout = logout;
			vm.lang = $translate.use();
			vm.availableLangs = $translate.getAvailableLanguageKeys();
			vm.selectLang = selectLang;
		}

		function logout () {
			userService.logout({noHttpError: true}).catch(function (error) {
				if (!angular.isObject(error) || error.status !== 401) {
					$log.warn('Couldn\'t logout the user serverside but we go to login anyway', error);
					return;
				}
				$log.warn('Couldn\'t logout the user serverside', error);
				return $q.reject(error);
			}).then(function () {
				$state.go('login');
			})
		}

		function selectLang (lang) {
			$translate.use(lang);
		}

	}
})();
