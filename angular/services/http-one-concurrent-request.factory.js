(function () {
	'use strict';

	angular
		.module('prisma.services')
		.factory('$httpOneConcurrentRequestFactory', httpOneConcurrentRequestFactory);

	httpOneConcurrentRequestFactory.$inject = ['$http', '$cacheFactory'];

	function httpOneConcurrentRequestFactory ($http, $cacheFactory) {

		var cache = $cacheFactory('$httpOneConcurrentRequestFactory');

		return function $httpOneConcurrentRequestFactory(url, options) {
			return cache.get(url) || cache.put(url, $http.get(url, options)
				.then(function(response) {
					return response;
				})
				.finally(function () {
					cache.remove(url);
				}));
		};
	}
})();
