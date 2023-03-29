(function() {
	'use strict';

	angular
		.module('prisma.config')
		.config(configure);

	configure.$inject = ['$localStorageProvider'];
	function configure ($localStorageProvider) {

		$localStorageProvider.setKeyPrefix('prisma');
	}
})();