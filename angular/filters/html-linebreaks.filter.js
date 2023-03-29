(function () {
	'use strict';

	angular
		.module('prisma.filters')
		.filter('htmlLinebreaks', htmlLinebreaks);

	function htmlLinebreaks () {
		return htmlLinebreaksFilter;

		////////////////

		function htmlLinebreaksFilter (input) {
      if (!input) {
        return;
      }
      return input.replace(/\n/g, '<br/>');
    }
	}

})();
