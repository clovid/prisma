(function () {
	'use strict';

	angular
		.module('prisma.services')
		.factory('toastFactory', toastFactory);

	toastFactory.$inject = ['$mdToast'];

	function toastFactory ($mdToast) {

		var defaultOptions = {
			delay: 5000,
			position: 'bottom left',
			action: 'OK',
		};

		var service = {
			show: show
		};
		return service;

		////////////////

		function show (content, customOptions) {
			var options = angular.extend({}, defaultOptions, customOptions);
			return $mdToast.show(
				$mdToast.simple()
					.textContent(content)
					.position(options.position)
					.action(options.action)
					.hideDelay(options.delay)
			);
		}
	}
})();