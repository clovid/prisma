(function () {
	'use strict';

	angular
		.module('prisma.services')
		.factory('usersFactory', usersFactory);

	usersFactory.$inject = ['$log', '$http', '$q', 'helperService'];

	function usersFactory ($log, $http, $q, helperService) {
		var service = {
			filter: filter,
			store: store,
			update: update,
			destroy: destroy,
			updateMultiple: updateMultiple,
		};
		return service;

		//////////////////////

		/**
		 * GET all users depending on the filter.
		 * @param  {Object} filter { name: String, modules: [] }
		 * @return {promise<Array>} users
		 */
		function filter (filter) {
			return $http.get('users', {params: filter})
				.catch(helperService.handleHttpErrorFn('Could not load users'))
				.then(helperService.handleHttpResponseFn());
		}

		/**
		 * POST a new user to store it on server.
		 * @param  {Object} user
		 * @return {promise<Object>} created user with id
		 */
		function store (user) {
			if (user === undefined)
				return $q.reject({statusText: 'No user provided', status: 400});

			return $http.post('users', user)
				.catch(helperService.handleHttpErrorFn('Could not store user'))
				.then(helperService.handleHttpResponseFn('user'));
		}

		/**
		 * PUT a given user to update an existing one.
		 * @param  {Object} user
		 * @return {promise<Object>} user
		 */
		function update (user) {
			if (user === undefined)
				return $q.reject({statusText: 'No user provided', status: 400});

			if (user.id === undefined)
				return $q.reject({statusText: 'No user id provided', status: 400});

			return $http.put('users/' + user.id, user)
				.catch(helperService.handleHttpErrorFn('Could not update user'))
				.then(helperService.handleHttpResponseFn('user'));
		}

		/**
		 * DELETE a given user to remove it from the server.
		 * @param  {Object} user
		 * @return {promise<bool>}
		 */
		function destroy (user) {
			if (user === undefined)
				return $q.reject({statusText: 'No user provided', status: 400});

			if (user.id === undefined)
				return $q.reject({statusText: 'No user id provided', status: 400});

			return $http.delete('users/' + user.id, {noHttpError: true})
				.catch(helperService.handleHttpErrorFn('Could not destroy users'))
				.then(helperService.handleHttpResponseFn());
		}

		/**
		 * PUT multiple user ids to update specific properties of multiple users.
		 * @param  {Array} userIds
		 * @param  {Object} updatedProperties { <property>: <value> } (normally only one property)
		 * @return {promise<Array>} ids of user that where updated
		 */
		function updateMultiple (userIds, updatedProperties) {
			if (userIds === undefined)
				return $q.reject({statusText: 'No user ids provided', status: 400});

			return $http.put('users', angular.extend({}, updatedProperties, {user_ids: userIds}))
				.catch(helperService.handleHttpErrorFn('Could not update users'))
				.then(helperService.handleHttpResponseFn('user_ids'));
		}
	}
})();
