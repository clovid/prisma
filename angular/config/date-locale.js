(function() {
	'use strict';

	angular
		.module('prisma.config')
		.config(configure);

	configure.$inject = ['$mdDateLocaleProvider'];
	function configure ($mdDateLocaleProvider) {
		$mdDateLocaleProvider.formatDate = function (date) {
			return date ? moment(date).format('DD.MM.YYYY') : null;
		}

		$mdDateLocaleProvider.parseDate = function (dateString) {
			var m = moment(dateString, 'DD.MM.YYYY', true);
			return m.isValid() ? m.toDate() : new Date(NaN);
		}
	}
})();
