(function() {
	'use strict';

	angular
		.module('prisma.config')
		.config(configure);

	configure.$inject = ['$httpProvider'];
	function configure ($httpProvider) {

		$httpProvider.interceptors.push(
			'loadingInterceptor',
			'httpErrorInterceptor'
		);
		// $locationProvider.html5Mode(true);
	}
})();