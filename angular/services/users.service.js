(function () {
	'use strict';

	angular
		.module('prisma.services')
		.service('usersService', usersService);

	usersService.$inject = ['$log', '$rootScope', '$q', '_', 'helperService', 'usersFactory', 'userService', 'modulesFactory'];

	function usersService ($log, $rootScope, $q, _, helperService, usersFactory, userService, modulesFactory) {
		var service = this;

		///////////////////////////
		/// Service description ///
		///////////////////////////

		service.index = index;
		service.store = usersFactory.store;
		service.update = usersFactory.update;
		service.destroy = usersFactory.destroy;
		service.updateModules = updateModules;
		service.updateModulesMultiple = updateModulesMultiple;
		service.modules = modules;

		service.counts = {
			current: 0,
			total: 0,
		}

		/////////////////////////
		/// Private variables ///
		/////////////////////////

		var currentUsers = [];
		var currentFilter;

		//////////////////////
		/// Public methods ///
		//////////////////////

		/**
		 * Returns all users depending on the given filter.
		 * If the filter didn't change since the last call and there
		 * are local users, returns them.
		 * Otherwise loads them from the server and also updates the counts.
		 * @param  {Object} filter { name: String, modules: [] }
		 * @param {bool} force retrieval from server, defaults to false
		 * @return {promise<Arrray>}
		 */
		function index (filter, force) {
			if (!force && angular.equals(filter, currentFilter) && currentUsers.length > 0)
				return $q.when(currentUsers);
			return usersFactory.filter(pTransformFilter(filter)).then(function (result) {
				currentFilter = angular.copy(filter);
				currentUsers = result.users || [];
				service.counts.current = result.count || 0;
				service.counts.total = result.total || 0;
				return currentUsers;
			});
		}

		/**
		 * Updates the module of a single user. Returns the CURRENT authenticated user.
		 * @param  {Object} user whose modules should be updated
		 * @param  {Array} modules that the user should have
		 * @return {promise<Object>} The current authenticated user NOT the updated user
		 */
		function updateModules (user, modules) {
			return pUpdate(angular.extend({}, user, {modules: modules}))
				.then(function (updatedUser) {
					angular.extend(user, updatedUser);
				})
				// we have to reload the current user in case he updated his own account
				.then(userService.reload);
		}

		/**
		 * Updates the modules of multiple users.
		 * Returns all user ids whose modules coulnd't be updated.
		 * @param  {Array} users
		 * @param  {Array} modules
		 * @return {promise<Array>} of user ids
		 */
		function updateModulesMultiple (users, modules) {
			if (users === undefined)
				return $q.reject({statusText: 'Missing users', status: 400});
			var userIds = _.pluck(users, 'id');
			var failedIds = [];
			return usersFactory.updateMultiple(userIds, {modules: modules}).then(function (updatedIds) {
				_.each(users, function (user) {
					if (updatedIds.indexOf(user.id) !== -1)
						angular.extend(user, {modules: modules});
					else
						failedIds.push(user);
				});
				// we have to reload the current user in case he updated his own account
				return userService.reload();
			}).then(function () {
				return failedIds;
			}).catch(function (error) {
				$log.error('Error while updating users', users, error);
				return $q.reject(error);
			});
		}

		/**
		 * Returns all modules that match the given searchText (by name)
		 * @param  {String} searchText
		 * @return {promise<Array>} of modules
		 */
		function modules (searchText) {
			var promise = modulesFactory.index();
			if (!searchText)
				return promise;
			return promise.then(function (modules) {
				return _.filter(modules, helperService.comparatorFn(searchText, false, 'name'));
			});
		}

		///////////////////////
		/// Private methods ///
		///////////////////////

		/**
		 * Tells the factory to update this user server side
		 * and returns the updated user.
		 * @param  {Object} user
		 * @return {promise<Object>} updated user
		 */
		function pUpdate (user) {
			return usersFactory.update(user);
		}

		/**
		 * Transforms the given filter to use as GET-Parameter.
		 * Appends to the 'modules' key an array string '[]'
		 * so that the $http.get() method serializes it properly.
		 * @param  {Object} filter { name: String, modules: [] }
		 * @return {Object} transformedFilter { name: String, modules[]: [] }
		 */
		function pTransformFilter (filter) {
			var transformedFilter = angular.copy(filter);
			transformedFilter.modules = undefined;
			if (filter.modules && filter.modules.length > 0)
				transformedFilter['modules[]'] = _.map(filter.modules, function (module) { return module.id; });
			return transformedFilter;
		}

		/**
		 * Removes all loaded users and unsets the current filter.
		 * @return {undefined}
		 */
		function pClear () {
			currentUsers = [];
			currentFilter = undefined;
		}

		/////////////////
		/// Listeners ///
		/////////////////

		function initListeners () {
			$rootScope.$on('logout', pClear);
		}

		initListeners();
	}
})();
