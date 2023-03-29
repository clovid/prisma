(function () {
	'use strict';

	angular
		.module('prisma.controllers')
		.controller('HomeController', HomeController);

	HomeController.$inject = ['$log', '$rootScope', '$scope', 'modulesService', 'generalService'];

	function HomeController ($log, $rootScope, $scope, modulesService, generalService) {
		var vm = this;

		vm.$onInit = function() {
			methods();
			variables();
			listeners();

			refreshModuleList();
		}

		function methods () {
			vm.storeFilterToUserConfig = storeFilterToUserConfig;
			vm.setFilterFromUserConfig = setFilterFromUserConfig;
		}

		function variables () {
			generalService.config('user').catch(function () {
				return {};
			}).then(function (userConfig) {
				vm.userConfig = userConfig || {};
			});
		}

		function listeners () {
			vm.unregisterFns = [];
			$scope.$on('$destroy', function() {
				vm.unregisterFns.forEach(function (unregisterFn) { unregisterFn(); });
			});

			vm.unregisterFns.push(
				$rootScope.$on('update-filter', function (event) {
					refreshModuleList();
				})
			);
		}

		////////////////

		function refreshModuleList () {
			modulesService.getModules()
				.then(function (modules) {
					vm.modules = modules;
				})
				.then(modulesService.getFilteredList);
		}

		function storeFilterToUserConfig() {
			$rootScope.$broadcast('store-filter-to-user-config')
		}

		function setFilterFromUserConfig() {
			$rootScope.$broadcast('set-filter-from-user-config')
		}

	}
})();
