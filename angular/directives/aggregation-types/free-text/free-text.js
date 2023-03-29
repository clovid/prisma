(function () {
	'use strict';

	angular
		.module('prisma.directives')
		.directive('ldFreeText', ldFreeText);

	ldFreeText.$inject = [];

	function ldFreeText () {
		// Usage:
		//
		// Creates:
		//
		var directive = {
			restrict: 'A',
			templateUrl: 'views/directives/aggregation-types/free-text/free-text.html',
			scope: {
				data: '='
			}
		};
		return directive;
	}
})();