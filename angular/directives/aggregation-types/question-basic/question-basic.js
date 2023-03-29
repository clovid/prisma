(function () {
	'use strict';

	angular
		.module('prisma.directives')
		.directive('ldQuestionBasic', ldQuestionBasic);

	ldQuestionBasic.$inject = [];

	function ldQuestionBasic () {
		// Usage:
		//
		// Creates:
		//
		var directive = {
			bindToController: true,
			controller: Controller,
			controllerAs: 'vm',
			restrict: 'A',
			templateUrl: 'views/directives/aggregation-types/question-basic/question-basic.html',
			scope: {
				data: '='
			}
		};
		return directive;
	}

	Controller.$inject = [];

	function Controller () {
		var vm = this;

		vm.$onInit = function() {
			vm.order = {
				attribute: 'frequency',
				reverse: true,
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
