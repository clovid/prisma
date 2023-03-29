(function () {
	'use strict';

	angular
		.module('prisma.services')
		.service('userService', userService);

	userService.$inject = ['$log', '$rootScope', '$injector', '$http', '$q', '$interval', '$auth'];

	function userService ($log, $rootScope, $injector, $http, $q, $interval, $auth) {
		var service = this;

		service.login = login;
		service.loginTest = loginTest;
		service.isAuthenticated = $auth.isAuthenticated;
		service.logout = logout;
		service.user = user;
		service.reload = reload;
		service.token = $auth.getToken;
		service.storeConfig = storeConfig;

		var intervalHandler;
		var testInterval = 60000;
		service.startLoginTestHandler = startLoginTestHandler;
		service.stopLoginTestHandler = stopLoginTestHandler;

		var currentUser = {
			id: 0,
			login: '',
			firstname: '',
			lastname: '',
			active: false,
			is_admin: false,
			modules: [],
		};

		////////////////

		function login (credentials, config) {
			return $auth.login(credentials, config).then(function () {
				return pGetUser(config);
			});
		}

		function loginTest (config) {
			if (config === undefined)
				config = {};

			return $http.get('login-test', config).then(function (result) {
				if (result === undefined || result.data === undefined || !result.data.success)
					return $q.reject({statusText: 'Bad result', status: 500});
			});
		}

		function logout (config) {
			if (config === undefined)
				config = {};

			if (!service.isAuthenticated())
				return $q.reject({statusText: 'Not logged in', status: 401});

			return $http.post('logout', config)
				.catch(function (error) {
					$log.error('Error when logging out on server. Log out on client anyway', error);
					return; // we return no rejection on purpose
				})
				.then(function () {
					$rootScope.$broadcast('logout');
					currentUser.id = 0;
					return $q.when($auth.logout());
				});
		}

		function user () {
			if (currentUser.id !== 0)
				return $q.when(currentUser);
			return pGetUser();
		}

		/**
		 * Reloads the current user from the server.
		 * E.g. to get its new permissions.
		 * @return {promise<Object>} user
		 */
		function reload () {
			return pGetUser();
		}

		function storeConfig(config) {
			return $http.post('user/config', config)
				.then(function (result) {
					if (result === undefined || result.data === undefined) {
						return $q.reject({statusText: 'Bad result', status: 500});
					}
					return result.data;
				})
				.catch(function (error) {
					$log.error('Error when storing user config', error);
					return config;
				});
		}

		function startLoginTestHandler () {
			if (intervalHandler !== undefined)
				return;
			intervalHandler = $interval(function () {
				loginTest();
			}, testInterval);
		}

		function stopLoginTestHandler () {
			if (intervalHandler === undefined)
				return;
			$interval.cancel(intervalHandler);
			intervalHandler = undefined;
		}

		/////////////////////

		function pGetUser (config) {
			if (config === undefined)
				config = {};

			return $http.get('user', config).catch(function (error) {
				$log.error('Couldn\'t load user task', error);
				return $q.reject(error);
			}).then(function (result) {
				if (result === undefined || result.data === undefined || !result.data.success)
					return $q.reject({statusText: 'Bad result', status: 500});
				angular.extend(currentUser, result.data.user);
				return currentUser;
			});
		}
	}
})();
