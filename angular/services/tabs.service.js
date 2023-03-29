(function () {
	'use strict';

	angular
		.module('prisma.services')
		.service('tabsService', tabsService);

	tabsService.$inject = ['$log', '$q', '$state', '_', 'tabsProvider'];

	function tabsService ($log, $q, $state, _, tabsProvider) {
		this.load = load;

		var availableTabTemplates = [
			{ name: 'anamnesis' },
			{ name: 'diagnoses' },
			{ name: 'laboratory' },
			{ name: 'therapy' },
			{
				name: 'default',
				controller: 'DefaultTabController as vm'
			}, // for CAMPUS
			{
				name: 'default-with-image',
				controller: 'DefaultWithImageTabController as vm'
			}, // for VQuest
		];
		var defaultTemplateName = 'default';
		var defaultController = null;

		////////////////

		function load (tab) {
			// check if tab is already loaded
			if ($state.get('module.task.' + tab.name))
				return $q.when(tab);

			var templateName = defaultTemplateName;
			var controller = defaultController;

			// If no specific template is given, try with the tab name
			var wantedTemplate = tab.template || tab.name;
			var template = _.findWhere(availableTabTemplates, { name: wantedTemplate });
			if (template !== undefined) {
				templateName = template.name;
				controller = template.controller || null;
			}

			tabsProvider.add(tab.name, templateName, controller);

			return $q.when(tab);
		}
	}
})();
