(function () {
	'use strict';

	angular
		.module('prisma.services')
		.factory('modulesFactory', modulesFactory);

	modulesFactory.$inject = ['$log', '$q', '$http', 'helperService'];

	function modulesFactory ($log, $q, $http, helperService) {
		var service = {
			index: index,
			countDatasets: countDatasets,
		};
		return service;

		////////////////

		function index () {
			return $http.get('modules').catch(function (error) {
				$log.error('Couldn\'t load modules', error);
				return $q.reject(error);
			}).then(function (response) {
				if (!pValidateResponse(response))
					return $q.reject({statusText: 'Error when fetching modules.', status: 500});
				return response.data;
			});
		}

		function countDatasets (module, filter) {
			var cancel = $q.defer();
			return $http.get('modules/' + module.name + '/count-datasets', {
				params: helperService.formatFilter(filter),
				timeout: cancel.promise,
				cancel: cancel,
				// cache: true,
			}).catch(function (error) {
				if (!error || error.status !== -1) {
					$log.error('Couldn\'t load datasets count', error);
				}
				return $q.reject(error);
			}).then(function (response) {
				if (!pValidateResponse(response))
					return $q.reject({statusText: 'Error when fetching datasets count.', status: 500});
				return response.data;
			});
		}

		///////

		function pValidateResponse (response) {
			return (response !== undefined && response.data !== undefined)
		}
	}
})();
