(function() {
	'use strict';

	angular
		.module('prisma', [
			'prisma.run',
			'prisma.routes',
			'prisma.config',
			'prisma.filters',
			'prisma.services',
			'prisma.providers',
			'prisma.directives',
			'prisma.controllers',
		]);

	angular.module('prisma.run', ['ngMaterial']);
	angular.module('prisma.routes', ['ui.router']);
	angular.module('prisma.config', ['satellizer', 'ngStorage', 'pascalprecht.translate', 'ngCookies']);
	angular.module('prisma.filters', []);
	angular.module('prisma.services', ['underscore', 'ngStorage']);
	angular.module('prisma.providers', ['ui.router']);
	angular.module('prisma.directives', ['ngMaterial', 'ngMessages', 'angularResizable', 'panzoom', 'ngDropover', 'diff-match-patch']);
	angular.module('prisma.controllers', ['ngMaterial', 'ui.router', 'ngMessages', 'underscore', 'md.data.table', 'satellizer', 'ngSanitize', 'ngDropover']);
})();
