(function () {
	'use strict';

	angular
		.module('prisma.services')
		.service('tasksService', tasksService);

	tasksService.$inject = ['$log', '$q', '_', '$localStorage', 'filterService', 'tasksFactory', 'tabsService'];

	function tasksService ($log, $q, _, $localStorage, filterService, tasksFactory, tabsService) {
		this.getFilteredList = getFilteredList;
		this.getCurrentTask = getCurrentTask;
		this.selectById = selectById;
		this.deselect = deselect;

		this.getOpenTasks = getOpenTasks;
		this.openTask = openTask;
		this.closeTask = closeTask;
		this.closeTaskById = closeTaskById;

		this.getSupportedTabs = getSupportedTabs;
		this.loadOpenTasksFromStorage = loadOpenTasksFromStorage;

		var currentTask;
		var currentModuleName;

		var openTasks = [];

		function init() {
		}

		////////////////

		function getFilteredList (moduleName) {
			var filter = filterService.getFilter();
			return tasksFactory.list(moduleName, filter).then(function (tasks) {
				return tasks;
			}).catch(function (error) {
				$log.error('Error when listing tasks', error);
				return $q.reject(error);
			});
		}

		function getCurrentTask () {
			return currentTask;
		}

		function selectById (moduleName, taskId) {
			return getFilteredList(moduleName).then(function (tasks) {
				for (var i = tasks.length - 1; i >= 0; i--) {
					if (tasks[i].id === taskId){
						currentModuleName = moduleName;
						return currentTask = tasks[i];
					}
				}
				$log.error('Could not find task with this id', moduleName, taskId);
				return $q.reject({statusText: 'Could not find task with this id', status: 410});
			}).then(loadDataForTask);
		}

		function deselect (task) {
			if (currentTask === task)
				currentTask = undefined;
		}

		function loadDataForTask (task) {
			var filter = filterService.getFilter();
			return tasksFactory.loadData(currentModuleName, task, filter).then(function (taskData) {
				currentTask.data = taskData;
				return currentTask;
			});
		}

		function getOpenTasks () {
			return openTasks;
		}

		function openTask (task) {
			if (_.findWhere(openTasks, {id: task.id}) === undefined)
				openTasks.push(task);
		}

		function closeTask (task) {
			var index = _.findIndex(openTasks, function (openTask) {
				return openTask.id === task.id;
			});
			if (index === -1)
				return;
			openTasks.splice(index, 1);
		}

		function closeTaskById(id) {
			closeTask({id: id});
		}

		function getSupportedTabs (moduleName, task) {
			var tabs = [];
			return tasksFactory.loadTabs(moduleName, task.id).then(function (supportedTabs) {
                var promises = [];
                for (var i = 0; i < supportedTabs.length; i++) {
                    promises.push(
                        tabsService.load(supportedTabs[i]).then(function (tab) {
                            tabs.push(tab);
                        })
                    );
                }
                return $q.all(promises);
            })
            .then(function () {
            	task.supportedTabs = tabs;
                return tabs;
            });
		}

		/**
		 * Link openTasks with content of localStorage
		 * @return {undefined}
		 */
		function loadOpenTasksFromStorage (module) {
			if (!$localStorage.openTasks) {
				$localStorage.openTasks = {}
			}
			if (!$localStorage.openTasks[module.name]) {
				$localStorage.openTasks[module.name] = [];
			}
			openTasks = $localStorage.openTasks[module.name];
		}

		init();
	}
})();
