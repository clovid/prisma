(function () {
	'use strict';

	angular
		.module('prisma.controllers')
		.controller('ModuleTaskController', ModuleTaskController);

	ModuleTaskController.$inject = ['$log', '$scope', '$location', '$q', '$state', '$mdDialog', '_', 'toastFactory', 'tasksService', 'privacyConfig', 'task', 'supportedTabs'];

	function ModuleTaskController ($log, $scope, $location, $q, $state, $mdDialog, _, toastFactory, tasksService, privacyConfig, task, supportedTabs) {
		var vm = this;

		vm.$onInit = function() {

			if (task === undefined || supportedTabs === undefined) {
				return $state.go('module.tasks');
			}
			if (!supportedTabs.length) {
				toastFactory.show('Für Fall "' + task.title + '" sind keine Formulare aktiviert, die angezeigt werden können!');
				tasksService.closeTask(task);
				return $state.go('module.tasks');
			}
			// Check, if a tab is already selected
			if ($state.is('module.task') || getSelectedTab() === -1) {
				// If not, check, if a tab should be selected
				var wantedTabName = $location.search().goto;
				if (wantedTabName === undefined) {
					// If not, go to the first supported tab
					return $state.go(($state.is('module.task') ? '' : 'module.task') + '.' + supportedTabs[0].name, {}, { reload: true });
				} else {
					// If wanted tab is not supported go back to tasks overview
					if (_.findWhere(supportedTabs, { name: wantedTabName }) === undefined) {
						return $state.go('module.tasks');
					} else {
						// Otherwise load tab and force this controller to reload
						return $state.go('.' + wantedTabName, {}, { reload: true });
					}
				}
			}

			methods();
			variables();
			listeners();

			checkPrivacy();
      tasksService.openTask(task);
		}

		function methods () { }

		function variables () {
			vm.task = task;
			vm.selectedTab = getSelectedTab();
			vm.supportedTabs = supportedTabs;
		}

		function listeners () {
			$scope.$on("$destroy", function() {
				tasksService.deselect(task);
			});
		}

		////////////////

		function checkPrivacy () {
			if (task.numberOfDatasets > 0 && privacyConfig.minimum_task_datasets !== undefined && task.numberOfDatasets < privacyConfig.minimum_task_datasets)
				return showPrivacyAlert().catch(function () {
					$state.go('module.tasks');
				});
		}

		function showPrivacyAlert () {
			var alert = $mdDialog.alert()
				.title('Achtung - Datenschutzverletzung!')
				.htmlContent(
					'Dieser Fall enthält <strong>weniger als ' + privacyConfig.minimum_task_datasets + ' Datensätze</strong>.<br>' +
					'Dadurch kann keine Anonymität mehr gewährleistet werden.<br><br>' +
					'<b>Der Fall kann nicht angezeigt werden.</b>'
				)
				.ariaLabel('Datenschutzverletzung')
				.ok('Okay')
			return $mdDialog.show(alert).then(function () {
				return $q.reject();
			});
		}

		function getSelectedTab () {
			var currentTab = _.findWhere(supportedTabs, {name: $state.current.url});
			if (currentTab !== undefined) {
				return _.indexOf(supportedTabs, currentTab);
			}
			return -1;
		}
	}
})();
