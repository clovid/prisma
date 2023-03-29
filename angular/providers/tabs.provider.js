(function() {
	'use strict';

	angular
		.module('prisma.providers')
		.provider('tabsProvider', tabsProvider);

	tabsProvider.$inject = ['$stateProvider'];
	function tabsProvider ($stateProvider) {
		this.$get = function () {
			return {
				add: function (name, template, controllerAs) {
					var stateConfig = {
						url: name,
						views: {},
					};
					stateConfig.views[name] = {templateUrl: 'views/app/module-tabs/' + template + '.html'};
					if (controllerAs) {
						stateConfig.views[name].controller = controllerAs;
					}

					$stateProvider.state('module.task.' + name, stateConfig);
				}
			}
		};
	}
})();
