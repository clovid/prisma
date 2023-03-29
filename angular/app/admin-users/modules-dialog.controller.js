(function () {
	'use strict';

	angular
		.module('prisma.controllers')
		.controller('ModulesDialogController', ModulesDialogController);

	ModulesDialogController.$inject = ['$log', '$mdDialog', 'modules', 'selectedModules'];

	function ModulesDialogController ($log, $mdDialog, modules, selectedModules) {
		var vm = this;

		vm.modules = modules;
		vm.selectedModules = selectedModules;

		vm.cancel = function () {
			$mdDialog.cancel();
		}

		vm.submit = function (result) {
			$mdDialog.hide(result);
		}
	}
})();
