(function () {
	'use strict';

	angular
		.module('prisma.services')
		.factory('tasksFactory', tasksFactory);

	tasksFactory.$inject = ['$log', '$q', '$http', 'helperService'];

	function tasksFactory ($log, $q, $http, helperService) {
		var service = {
			list: list,
			loadData: loadData,
			loadTabs: loadTabs,
		};

		return service;

		////////////////

		function list (moduleName, filter) {
			return $http.get('modules/' + moduleName + '/tasks', {
				params: helperService.formatFilter(filter),
				cache: true,
			}).catch(function (error) {
				$log.error('Couldn\'t load task list', error);
				return $q.reject(error);
			}).then(function (response) {
				if (!pValidateResponse(response))
					return $q.reject({statusText: 'Error when fetching tasks list.', status: 500});
				return response.data;
			});
		}

		function loadData (moduleName, task, filter) {
			return $http.get('modules/' + moduleName + '/tasks/' + task.id, {
				params: helperService.formatFilter(filter),
				cache: true,
			}).catch(function (error) {
				$log.error('Couldn\'t load task data', error);
				return $q.reject(error);
			}).then(function (response) {
				if (!pValidateResponse(response))
					return $q.reject({statusText: 'Error when fetching task data.', status: 500});
				return response.data;
			});
		}

		function loadTabs (moduleName, taskId) {
			return $http.get('modules/' + moduleName + '/tasks/' + taskId + '/supported-tabs', {
				cache: true,
			}).catch(function (error) {
				$log.error('Couldn\'t load supported tabs for task', error);
				return $q.reject(error);
			}).then(function (response) {
				if (!pValidateResponse(response))
					return $q.reject({statusText: 'Error when fetching supported tabs for task.', status: 500});
				return response.data;
			});
		}

		///////

		function pValidateResponse (response) {
			return (response !== undefined && response.data !== undefined)
		}
	}
})();