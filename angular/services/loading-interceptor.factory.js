(function () {
	'use strict';

	angular
		.module('prisma.services')
		.factory('loadingInterceptor', loadingInterceptor);

	loadingInterceptor.$inject = ['$rootScope', '$q'];

	function loadingInterceptor ($rootScope, $q) {
		var service = {
			request: request,
			response: response,
			responseError: responseError
		};
		return service;

		////////////////

		function request (config) {
			if (!config.noLoadingIndicator)
				$rootScope.$broadcast('loading:show');
			return config;
		}

		function response (response) {
			if (!response.config.noLoadingIndicator)
				$rootScope.$broadcast('loading:hide');
			return response;
		}

		function responseError (rejection) {
			if (!rejection.config.noLoadingIndicator)
				$rootScope.$broadcast('loading:hide');
			return $q.reject(rejection);
		}
	}
})();