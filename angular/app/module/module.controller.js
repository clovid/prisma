(function () {
	'use strict';

	angular
		.module('prisma.controllers')
		.controller('ModuleController', ModuleController);

	ModuleController.$inject = ['$log', '$scope', '$state', '$stateParams', 'tasksService', 'module', 'taskList', 'privacyConfig'];

	function ModuleController ($log, $scope, $state, $stateParams, tasksService, module, taskList, privacyConfig) {
		var vm = this;

		vm.$onInit = function() {
			if (module === undefined) {
				return $state.go('home');
			}

			if (taskList === undefined) {
				return $state.go('home');
			}

			tasksService.loadOpenTasksFromStorage(module);

			methods();
			variables();
			listeners();
		}

		function methods () {
			vm.back = goToParentState;
			vm.openTask = openTask;
			vm.switchTask = switchTask;
			vm.closeTask = closeTask;
			vm.currentTask = tasksService.getCurrentTask;
		}

		function variables () {
			vm.module = module;
			vm.taskList = taskList;
			vm.openTasks = tasksService.getOpenTasks();
			vm.privacyConfig = privacyConfig;
		}

		function listeners () {}

		////////////////

		function goToParentState () {
			if ($state.includes('module.task'))
				return $state.go('module.tasks');
			return $state.go('home');
		}

		function openTask (task) {
			return $state.go('module.task', {module: vm.module.name, id: task.id});
		}

		function switchTask (task) {
			if ($state.includes('module.task'))
				return $state.go($state.current.name, {module: vm.module.name, id: task.id});
			return openTask(task);
		}

		function closeTask (task) {
			tasksService.closeTask(task);
			if ($state.includes('module.task') && tasksService.getCurrentTask().id === task.id)
				return $state.go('module.tasks');
		}
	}
})();
