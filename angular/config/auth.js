(function() {
	'use strict';

	angular
		.module('prisma.config')
		.config(configure);

	configure.$inject = ['$authProvider'];

	function configure ($authProvider) {

		$authProvider.baseUrl = document.getElementsByTagName('base')[0].href;
		$authProvider.loginUrl = 'login';
		$authProvider.tokenName = 'user_ticket';
	}
})();