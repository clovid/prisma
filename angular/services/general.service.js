(function () {
	'use strict';

	angular
		.module('prisma.services')
		.service('generalService', generalService);

	generalService.$inject = ['$log', '$http', '$q', '_'];

	function generalService ($log, $http, $q, _) {
		var service = this;

		service.config = config;

		////////////////

		function config (type, httpSettings) {
			httpSettings = httpSettings || {cache: true}
			return pConfig(httpSettings).then(function (config) {
				if (type === undefined)
					return config;
				if (config[type] === undefined)
					return $q.reject({statusText: 'Type not found in config!', status: 404});
				return config[type];
			})

		}

		////////////////

		function pConfig (httpSettings) {
			return $http.get('config', httpSettings).catch(function (error) {
				$log.error('Couldn\'t load config', error);
				return $q.reject(error);
			}).then(function (response) {
				if (response === undefined || response.data === undefined)
					return $q.reject({statusText: 'Error when fetching config.', status: 500});
				return response.data;
			});
		}

	}
})();