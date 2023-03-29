(function () {
	'use strict';

	angular
		.module('prisma.services')
		.service('helperService', helperService);

	helperService.$inject = [];

	function helperService () {
		this.comparatorFn = comparatorFn;
		this.formatFilter = formatFilter;
		this.handleHttpErrorFn = handleHttpErrorFn;
		this.handleHttpResponseFn = handleHttpResponseFn;

		////////////////

		/**
		 * Creates a new comparision function
		 * @param  {String} value
		 * @param  {Boolean} strict 	Strict comparison? If no, then task insensitive comparison
		 * @param  {String} property   	 Optional. If set, the value will matched agains this property
		 * @return {function}            [description]
		 */
		function comparatorFn (value, strict, property) {
			if (strict === undefined || strict === false) {
				var regExp = new RegExp(value, 'i')

				if (property === undefined)
					return function (item) {
						return item.search(regExp) !== -1;
					}

				return function (item) {
					return item.hasOwnProperty(property) && item[property].search(regExp) !== -1;
				}
			}

			if (property === undefined)
				return function (item) {
					return item.indexOf(value) !== -1;
				}
			return function (item) {
				return item.hasOwnProperty(property) && item[property].indexOf(value) !== -1;
			}
		}

		/**
		 * Formats the filter to work with the backend.
		 * Transforms the objects in the filter into relevant params.
		 * @param  {object} filter {users, timespans}
		 * @return {object}        params for GET query
		 */
		function formatFilter (filter) {
			var params = {};

			if (filter === undefined)
				return params;

			if (filter.users !== undefined){
				var cadsIds = [];
				for (var i = filter.users.length - 1; i >= 0; i--) {
					cadsIds = cadsIds.concat(filter.users[i].cadsIds);
				}
				params.cads_ids = cadsIds.join(',');
			}

			if (filter.timespans !== undefined) {
				for (var i = filter.timespans.length - 1; i >= 0; i--) {
					params['timespans[' + i + ']'] = filter.timespans[i][0].getTime() + ',' + filter.timespans[i][1].getTime();
				}
			}

			return params;
		}

		/**
		 * Creates an error function to handle a http error
		 * and uses an optional message.
		 * @param  {string|undefined} message
		 * @return {Rejection}
		 */
		function handleHttpErrorFn (message) {
			return function (error) {
				$log.error(message);
				var statusText = message;
				var status = 500;
				if (angular.isObject(error)) {
					// StatusText
					if (error.data && error.data.error) {
						statusText = error.data.error;
					} else if (error.statusText) {
						statusText = error.statusText;
					}
					// Status
					if (error.status) {
						status = error.status;
					}
				}
				return $q.reject({statusText: statusText, status: status});
			}
		}

		/**
		 * Generates a function that handles the result.
		 * In case of an error, it returns a rejection.
		 * In case of success, it returns the given responseKey of result.data.
		 * @param  {String} responseKey
		 * @return {Object|Array|rejection}
		 */
		function handleHttpResponseFn (responseKey) {
			return function (result) {
				if (result === undefined || result.data === undefined) {
					return $q.reject({statusText: 'Bad result', status: 500});
				}
				if (responseKey === undefined) {
					return result.data;
				}
				return result.data[responseKey];
			}
		}

	}
})();
