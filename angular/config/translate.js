(function() {
	'use strict';

	angular
		.module('prisma.config')
		.config(configure);

	configure.$inject = ['$translateProvider'];
	function configure ($translateProvider) {

    var langFromHtml = document.documentElement.lang;

		$translateProvider
      .useStaticFilesLoader({
        prefix: 'lang/',
        suffix: '.json'
      })
      .useSanitizeValueStrategy('escape')
      .useLocalStorage()
      .registerAvailableLanguageKeys(['de', 'en', 'nl'])
      .fallbackLanguage('en')
      .preferredLanguage(langFromHtml);
	}
})();