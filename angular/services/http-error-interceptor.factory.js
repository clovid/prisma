(function () {
	'use strict';

	angular
		.module('prisma.services')
		.factory('httpErrorInterceptor', httpErrorInterceptor);

	httpErrorInterceptor.$inject = ['$rootScope', '$q'];

	function httpErrorInterceptor ($rootScope, $q) {
		var service = {
			responseError: responseError,
		};
		return service;

		////////////////

		function responseError (rejection) {
			if (!rejection.config.noHttpError) {
				var error;
				var context = {};
				switch (rejection.status) {

					case 401: // Unauthorized
						error = 'errors.unauthorized';
						break;

					case 403: // Forbidden
						error = 'errors.forbidden';
						break;

					case 404: // Not Found
						error = 'errors.notFound';
						context.url = rejection.config.url;
						break;

					case 405: // Method Not Allowed
						error = 'errors.methodNotAllowed';
						if (rejection.data !== undefined && rejection.data.error !== undefined) {
							error = rejection.data.error;
						}
						break;

					case 414: // Request-URI Too Large
						error = 'errors.filterToLarge';
						break;

					case 422: // Unprocessable entity
						error = 'errors.unprocessableEntity';
						// get first entity
						var entity = Object.keys(rejection.data)[0];
						if (entity !== undefined && rejection.data[entity] !== undefined)
							error = rejection.data[entity].toString();
						break;

					case 429: // Too many requests
						error = 'errors.tooManyRequests';
						break;

					case 500: // Internal server error
						error = 'errors.externalServer';
						break;

					case -1: // Aborted request
						error = undefined;
						break;

					default:
						error = rejection.statusText;

				}
				$rootScope.$broadcast('app-error', error, rejection.status, context);
			}
			return $q.reject(rejection);
		}
	}
})();
