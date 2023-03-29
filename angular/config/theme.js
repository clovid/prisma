(function() {
	'use strict';

	angular
		.module('prisma.config')
		.config(configure);

	configure.$inject = ['$mdThemingProvider'];
	function configure ($mdThemingProvider) {

		$mdThemingProvider.theme('default')
			.primaryPalette('lime')
			.accentPalette('orange')
			.warnPalette('red');
	}
})();