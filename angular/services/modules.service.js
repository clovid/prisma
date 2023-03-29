(function () {
	'use strict';

	angular
		.module('prisma.services')
		.service('modulesService', modulesService);

	modulesService.$inject = ['$rootScope', '$log', '$q', 'filterService', 'modulesFactory'];

	function modulesService ($rootScope, $log, $q, filterService, modulesFactory) {
		var service = this;

		service.getModules = getModules;
		service.getFilteredList = getFilteredList;
		service.selectByName = selectByName;

		var modules = [];

		$rootScope.$on('logout', function (event) {
			modules = [];
		});

		////////////////

		/**
		 * Returns only available modules for the current user
		 */
		function getModules () {
			if (modules.length > 0)
				return $q.when(modules);

			return modulesFactory.index().then(function (loadedModules) {
				modules = _.filter(loadedModules, function (module) { return module.active_for_user; });
				angular.forEach(modules, function (module) {
					module.isLoaded = false;
				});
				return modules;
			}).catch(function (error) {
				$log.error('Error when fetching modules', error);
				return $q.reject(error);
			});
		}

		function getFilteredList () {
			var filter = filterService.getFilter();
			return getModules().then(function (modules) {
				var modulePromises = [];
				angular.forEach(modules, function (module) {
					modulePromises.push(pModuleWithDatasetsCount(module, filter));
				});
				return $q.all(modulePromises).then(function () {
					return modules;
				});
			});
		}

		function selectByName (moduleName) {
			return getModules().then(function (modules) {
				for (var i = modules.length - 1; i >= 0; i--) {
					if (modules[i].name === moduleName)
						return pModuleWithDatasetsCount(modules[i], filterService.getFilter());
				}
				$log.error('Could not find module', moduleName);
				return $q.reject({statusText: 'Could not find module.', status: 410});
			});
		}

		////////////

		function pLoadDatasetsCount (module, filter) {
			return modulesFactory.countDatasets(module, filter).catch(function (error) {
				if (!error || error.status !== -1) {
					$log.error('Error when counting datasets', error);
				}
				return $q.reject(error);
			});
		}

		function pModuleWithDatasetsCount (module, filter) {
			module.isLoaded = false;
			module.isCancelled = false;
			return pLoadDatasetsCount(module, filter).then(function (numberOfDatasets) {
				module.numberOfDatasets = numberOfDatasets;
				module.isLoaded = true;
				return module;
			})
			.catch(function (error) {
				if (error && error.status === -1) {
					module.numberOfDatasets = 0;
					module.isCancelled = true;
					return module;
				}
			});
		}


	}
})();
