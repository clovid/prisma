(function() {
	'use strict';

	angular
		.module('prisma.config')
		.config(configure);

	configure.$inject = ['$sceDelegateProvider'];
	function configure ($sceDelegateProvider) {
		$sceDelegateProvider.resourceUrlWhitelist([
      'self',
      'https://clovid.uni-muenster.de/**',
      'https://omero.clovid.org/**',
      'http://localhost:8080/**',
    ]);
	}
})();