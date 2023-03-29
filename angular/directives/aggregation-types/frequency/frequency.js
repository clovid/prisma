(function () {
	'use strict';

	angular
		.module('prisma.directives')
		.directive('ldFrequency', ldFrequency);

	ldFrequency.$inject = [];

	function ldFrequency () {
		// Usage:
		//
		// Creates:
		//
		var directive = {
			restrict: 'A',
			templateUrl: 'views/directives/aggregation-types/frequency/frequency.html',
			scope: {
				data: '='
			}
		};
		return directive;
	}
})();