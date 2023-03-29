(function () {
	'use strict';

	angular
		.module('prisma.directives')
		.directive('ldFilterSummary', ldFilterSummary);

	ldFilterSummary.$inject = [];

	function ldFilterSummary () {
		// Usage:
		//
		// Creates:
		//
		var directive = {
			bindToController: true,
			controller: Controller,
			controllerAs: 'vm',
			restrict: 'A',
			templateUrl: 'views/directives/filter-summary/filter-summary.html',
			scope: {
			}
		};
		return directive;
	}

	Controller.$inject = ['$log', '$scope', '$rootScope', 'filterService'];

	function Controller ($log, $scope, $rootScope, filterService) {
		var vm = this;

		vm.$onInit = function() {
			methods();
			variables();
			listeners();

			setDefaults();
		}

		function methods () { }

		function variables () {
			vm.options = {
				dropover: {
					position: 'bottom-center',
					triggerEvent: 'hover',
				},
				maxUsersDisplay: 2,
			}
		}

		function listeners () {
			vm.unregisterFns = [];
			$scope.$on('$destroy', function() {
				vm.unregisterFns.forEach(function (unregisterFn) { unregisterFn(); });
			});
			vm.unregisterFns.push(
				$rootScope.$on('update-filter', function(event) {
					updateSummary();
				})
			)
		}

		///////////////////////

		function setDefaults () {
			updateSummary();
		}

		function updateSummary () {
			var filter = filterService.getFilter();
			vm.users = filter.users;
			vm.timespans = filter.timespans;
		}
	}
})();
