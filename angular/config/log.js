(function() {
	'use strict';

	angular
		.module('prisma.config')
		.config(configure);

	configure.$inject = ['$logProvider'];
	function configure ($logProvider) {
		$logProvider.debugEnabled(true);
	}
})();