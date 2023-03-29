(function () {
	'use strict';

	angular
		.module('prisma.directives')
		.directive('ldFrequencyDistribution', ldFrequencyDistribution);

	ldFrequencyDistribution.$inject = [];

	function ldFrequencyDistribution () {
		// Usage:
		//
		// Creates:
		//
		var directive = {
			bindToController: true,
			controller: Controller,
			controllerAs: 'vm',
			restrict: 'A',
			templateUrl: 'views/directives/aggregation-types/frequency-distribution/frequency-distribution.html',
			scope: {
				data: '=',
				orderAttribute: '=?',
				orderReverse: '=?',
			}
		};
		return directive;
	}

	Controller.$inject = [];

	function Controller () {
		var vm = this;

		vm.$onInit = function() {
			vm.order = {
				attribute: vm.orderAttribute || 'frequency',
				reverse: (vm.orderReverse !== undefined ? vm.orderReverse : true),
			}

			vm.orderBy = function (attribute) {
				if (attribute === vm.order.attribute)
					vm.order.reverse = !vm.order.reverse;
				else {
					vm.order.attribute = attribute;
					vm.order.reverse = true;
				}
			}
		}
	}
})();
