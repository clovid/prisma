(function() {
	'use strict';

	angular
		.module('prisma', [
			'prisma.run',
			'prisma.routes',
			'prisma.config',
			'prisma.filters',
			'prisma.services',
			'prisma.providers',
			'prisma.directives',
			'prisma.controllers',
		]);

	angular.module('prisma.run', ['ngMaterial']);
	angular.module('prisma.routes', ['ui.router']);
	angular.module('prisma.config', ['satellizer', 'ngStorage', 'pascalprecht.translate', 'ngCookies']);
	angular.module('prisma.filters', []);
	angular.module('prisma.services', ['underscore', 'ngStorage']);
	angular.module('prisma.providers', ['ui.router']);
	angular.module('prisma.directives', ['ngMaterial', 'ngMessages', 'angularResizable', 'panzoom', 'ngDropover', 'diff-match-patch']);
	angular.module('prisma.controllers', ['ngMaterial', 'ui.router', 'ngMessages', 'underscore', 'md.data.table', 'satellizer', 'ngSanitize', 'ngDropover']);
})();

(function () {
	'use strict';

	angular
		.module('prisma.services')
		.service('usersService', usersService);

	usersService.$inject = ['$log', '$rootScope', '$q', '_', 'helperService', 'usersFactory', 'userService', 'modulesFactory'];

	function usersService ($log, $rootScope, $q, _, helperService, usersFactory, userService, modulesFactory) {
		var service = this;

		///////////////////////////
		/// Service description ///
		///////////////////////////

		service.index = index;
		service.store = usersFactory.store;
		service.update = usersFactory.update;
		service.destroy = usersFactory.destroy;
		service.updateModules = updateModules;
		service.updateModulesMultiple = updateModulesMultiple;
		service.modules = modules;

		service.counts = {
			current: 0,
			total: 0,
		}

		/////////////////////////
		/// Private variables ///
		/////////////////////////

		var currentUsers = [];
		var currentFilter;

		//////////////////////
		/// Public methods ///
		//////////////////////

		/**
		 * Returns all users depending on the given filter.
		 * If the filter didn't change since the last call and there
		 * are local users, returns them.
		 * Otherwise loads them from the server and also updates the counts.
		 * @param  {Object} filter { name: String, modules: [] }
		 * @param {bool} force retrieval from server, defaults to false
		 * @return {promise<Arrray>}
		 */
		function index (filter, force) {
			if (!force && angular.equals(filter, currentFilter) && currentUsers.length > 0)
				return $q.when(currentUsers);
			return usersFactory.filter(pTransformFilter(filter)).then(function (result) {
				currentFilter = angular.copy(filter);
				currentUsers = result.users || [];
				service.counts.current = result.count || 0;
				service.counts.total = result.total || 0;
				return currentUsers;
			});
		}

		/**
		 * Updates the module of a single user. Returns the CURRENT authenticated user.
		 * @param  {Object} user whose modules should be updated
		 * @param  {Array} modules that the user should have
		 * @return {promise<Object>} The current authenticated user NOT the updated user
		 */
		function updateModules (user, modules) {
			return pUpdate(angular.extend({}, user, {modules: modules}))
				.then(function (updatedUser) {
					angular.extend(user, updatedUser);
				})
				// we have to reload the current user in case he updated his own account
				.then(userService.reload);
		}

		/**
		 * Updates the modules of multiple users.
		 * Returns all user ids whose modules coulnd't be updated.
		 * @param  {Array} users
		 * @param  {Array} modules
		 * @return {promise<Array>} of user ids
		 */
		function updateModulesMultiple (users, modules) {
			if (users === undefined)
				return $q.reject({statusText: 'Missing users', status: 400});
			var userIds = _.pluck(users, 'id');
			var failedIds = [];
			return usersFactory.updateMultiple(userIds, {modules: modules}).then(function (updatedIds) {
				_.each(users, function (user) {
					if (updatedIds.indexOf(user.id) !== -1)
						angular.extend(user, {modules: modules});
					else
						failedIds.push(user);
				});
				// we have to reload the current user in case he updated his own account
				return userService.reload();
			}).then(function () {
				return failedIds;
			}).catch(function (error) {
				$log.error('Error while updating users', users, error);
				return $q.reject(error);
			});
		}

		/**
		 * Returns all modules that match the given searchText (by name)
		 * @param  {String} searchText
		 * @return {promise<Array>} of modules
		 */
		function modules (searchText) {
			var promise = modulesFactory.index();
			if (!searchText)
				return promise;
			return promise.then(function (modules) {
				return _.filter(modules, helperService.comparatorFn(searchText, false, 'name'));
			});
		}

		///////////////////////
		/// Private methods ///
		///////////////////////

		/**
		 * Tells the factory to update this user server side
		 * and returns the updated user.
		 * @param  {Object} user
		 * @return {promise<Object>} updated user
		 */
		function pUpdate (user) {
			return usersFactory.update(user);
		}

		/**
		 * Transforms the given filter to use as GET-Parameter.
		 * Appends to the 'modules' key an array string '[]'
		 * so that the $http.get() method serializes it properly.
		 * @param  {Object} filter { name: String, modules: [] }
		 * @return {Object} transformedFilter { name: String, modules[]: [] }
		 */
		function pTransformFilter (filter) {
			var transformedFilter = angular.copy(filter);
			transformedFilter.modules = undefined;
			if (filter.modules && filter.modules.length > 0)
				transformedFilter['modules[]'] = _.map(filter.modules, function (module) { return module.id; });
			return transformedFilter;
		}

		/**
		 * Removes all loaded users and unsets the current filter.
		 * @return {undefined}
		 */
		function pClear () {
			currentUsers = [];
			currentFilter = undefined;
		}

		/////////////////
		/// Listeners ///
		/////////////////

		function initListeners () {
			$rootScope.$on('logout', pClear);
		}

		initListeners();
	}
})();

(function () {
	'use strict';

	angular
		.module('prisma.services')
		.factory('usersFactory', usersFactory);

	usersFactory.$inject = ['$log', '$http', '$q', 'helperService'];

	function usersFactory ($log, $http, $q, helperService) {
		var service = {
			filter: filter,
			store: store,
			update: update,
			destroy: destroy,
			updateMultiple: updateMultiple,
		};
		return service;

		//////////////////////

		/**
		 * GET all users depending on the filter.
		 * @param  {Object} filter { name: String, modules: [] }
		 * @return {promise<Array>} users
		 */
		function filter (filter) {
			return $http.get('users', {params: filter})
				.catch(helperService.handleHttpErrorFn('Could not load users'))
				.then(helperService.handleHttpResponseFn());
		}

		/**
		 * POST a new user to store it on server.
		 * @param  {Object} user
		 * @return {promise<Object>} created user with id
		 */
		function store (user) {
			if (user === undefined)
				return $q.reject({statusText: 'No user provided', status: 400});

			return $http.post('users', user)
				.catch(helperService.handleHttpErrorFn('Could not store user'))
				.then(helperService.handleHttpResponseFn('user'));
		}

		/**
		 * PUT a given user to update an existing one.
		 * @param  {Object} user
		 * @return {promise<Object>} user
		 */
		function update (user) {
			if (user === undefined)
				return $q.reject({statusText: 'No user provided', status: 400});

			if (user.id === undefined)
				return $q.reject({statusText: 'No user id provided', status: 400});

			return $http.put('users/' + user.id, user)
				.catch(helperService.handleHttpErrorFn('Could not update user'))
				.then(helperService.handleHttpResponseFn('user'));
		}

		/**
		 * DELETE a given user to remove it from the server.
		 * @param  {Object} user
		 * @return {promise<bool>}
		 */
		function destroy (user) {
			if (user === undefined)
				return $q.reject({statusText: 'No user provided', status: 400});

			if (user.id === undefined)
				return $q.reject({statusText: 'No user id provided', status: 400});

			return $http.delete('users/' + user.id, {noHttpError: true})
				.catch(helperService.handleHttpErrorFn('Could not destroy users'))
				.then(helperService.handleHttpResponseFn());
		}

		/**
		 * PUT multiple user ids to update specific properties of multiple users.
		 * @param  {Array} userIds
		 * @param  {Object} updatedProperties { <property>: <value> } (normally only one property)
		 * @return {promise<Array>} ids of user that where updated
		 */
		function updateMultiple (userIds, updatedProperties) {
			if (userIds === undefined)
				return $q.reject({statusText: 'No user ids provided', status: 400});

			return $http.put('users', angular.extend({}, updatedProperties, {user_ids: userIds}))
				.catch(helperService.handleHttpErrorFn('Could not update users'))
				.then(helperService.handleHttpResponseFn('user_ids'));
		}
	}
})();

(function () {
	'use strict';

	angular
		.module('prisma.services')
		.service('userService', userService);

	userService.$inject = ['$log', '$rootScope', '$injector', '$http', '$q', '$interval', '$auth'];

	function userService ($log, $rootScope, $injector, $http, $q, $interval, $auth) {
		var service = this;

		service.login = login;
		service.loginTest = loginTest;
		service.isAuthenticated = $auth.isAuthenticated;
		service.logout = logout;
		service.user = user;
		service.reload = reload;
		service.token = $auth.getToken;
		service.storeConfig = storeConfig;

		var intervalHandler;
		var testInterval = 60000;
		service.startLoginTestHandler = startLoginTestHandler;
		service.stopLoginTestHandler = stopLoginTestHandler;

		var currentUser = {
			id: 0,
			login: '',
			firstname: '',
			lastname: '',
			active: false,
			is_admin: false,
			modules: [],
		};

		////////////////

		function login (credentials, config) {
			return $auth.login(credentials, config).then(function () {
				return pGetUser(config);
			});
		}

		function loginTest (config) {
			if (config === undefined)
				config = {};

			return $http.get('login-test', config).then(function (result) {
				if (result === undefined || result.data === undefined || !result.data.success)
					return $q.reject({statusText: 'Bad result', status: 500});
			});
		}

		function logout (config) {
			if (config === undefined)
				config = {};

			if (!service.isAuthenticated())
				return $q.reject({statusText: 'Not logged in', status: 401});

			return $http.post('logout', config)
				.catch(function (error) {
					$log.error('Error when logging out on server. Log out on client anyway', error);
					return; // we return no rejection on purpose
				})
				.then(function () {
					$rootScope.$broadcast('logout');
					currentUser.id = 0;
					return $q.when($auth.logout());
				});
		}

		function user () {
			if (currentUser.id !== 0)
				return $q.when(currentUser);
			return pGetUser();
		}

		/**
		 * Reloads the current user from the server.
		 * E.g. to get its new permissions.
		 * @return {promise<Object>} user
		 */
		function reload () {
			return pGetUser();
		}

		function storeConfig(config) {
			return $http.post('user/config', config)
				.then(function (result) {
					if (result === undefined || result.data === undefined) {
						return $q.reject({statusText: 'Bad result', status: 500});
					}
					return result.data;
				})
				.catch(function (error) {
					$log.error('Error when storing user config', error);
					return config;
				});
		}

		function startLoginTestHandler () {
			if (intervalHandler !== undefined)
				return;
			intervalHandler = $interval(function () {
				loginTest();
			}, testInterval);
		}

		function stopLoginTestHandler () {
			if (intervalHandler === undefined)
				return;
			$interval.cancel(intervalHandler);
			intervalHandler = undefined;
		}

		/////////////////////

		function pGetUser (config) {
			if (config === undefined)
				config = {};

			return $http.get('user', config).catch(function (error) {
				$log.error('Couldn\'t load user task', error);
				return $q.reject(error);
			}).then(function (result) {
				if (result === undefined || result.data === undefined || !result.data.success)
					return $q.reject({statusText: 'Bad result', status: 500});
				angular.extend(currentUser, result.data.user);
				return currentUser;
			});
		}
	}
})();

(function () {
	'use strict';

	angular
		.module('prisma.services')
		.service('treeService', treeService);

	treeService.$inject = ['_'];

	function treeService (_) {
		this.createParentReferences = createParentReferences;
		this.setParentOfChildrenFn = setParentOfChildrenFn;
		this.getPathToNode = getPathToNode;
		this.getPropertyPathToNode = getPropertyPathToNode
		this.filterRecursive = filterRecursive;
		this.eachRecursive = eachRecursive;

		////////////////

		/**
		 * Add for each child of the tree its parent as reference
		 * @param  {Array} children
		 * @return {undefined}
		 */
		function createParentReferences(tree) {
			_.each(tree.children, setParentOfChildrenFn(tree));
			_.each(tree.children, createParentReferences);
			return tree;
		}

		function setParentOfChildrenFn(parent) {
			return function (children) {
				for (var i = children.length - 1; i >= 0; i--) {
					children[i].parent = parent;
				}
				return children;
			}
		}

		function getPathToNode(node) {
			return pGetPropertyPathToNodeHelper(node, [], 'id');
		}

		function getPropertyPathToNode(node, property) {
			return pGetPropertyPathToNodeHelper(node, [], 'name');
		}

		/**
		 * Recursive implementation of _.filter method.
		 * From http://underscorejs.org/#filter:
		 * Looks through each value in the list, returning an array of all the values
		 * that pass a truth test (predicate).
		 * @param  {Array} list      Tree-like structure
		 * @param  {Function} predicate Filter function (truth test) that should be performed with each child
		 * @param  {String} node      Property which holds the children. Default: 'children'
		 * @param  {?} context   from underscorejs definition
		 * @return {Array}           filtered
		 */
		function filterRecursive (list, predicate, node, context) {
			if (!list || !list.length) {
				list = [];
			}
			node = node || 'children';
			return pFilterRecursive(list, predicate, node, context);
		}

		/**
		 * Recursive implementation of _.each method.
		 * From http://underscorejs.org/#each:
		 * Iterates over a list of elements, yielding each in turn to an iteratee function.
		 * The iteratee is bound to the context object, if one is passed. Each invocation of
		 * iteratee is called with three arguments: (element, index, list). If list is a JavaScript
		 * object, iteratee's arguments will be (value, key, list). Returns the list for chaining.
		 * @param  {Array} list     Tree-like structure
		 * @param  {Function} iteratee [description]
		 * @param  {String} node     Property which holds the children. Default: 'children'
		 * @param  {?} context  from underscorejs definition
		 * @return {Array}          list
		 */
		function eachRecursive (list, iteratee, node, context) {
			if (!list || !list.length) {
				return;
			}
			node = node || 'children';
			return pEachRecursive(list, iteratee, node, context);
		}

		/////////////////

		function pGetPropertyPathToNodeHelper(node, path, property) {
			path.unshift(node[property]);
			if (!node.parent) {
				return path;
			}
			return pGetPropertyPathToNodeHelper(node.parent, path, property);
		}

		function pFilterRecursive(list, predicate, node, context) {
			var result = _.filter(list, predicate, context);
			for (var i = list.length - 1; i >= 0; i--) {
				if (list[i][node] && list[i][node].length > 0) {
					result = result.concat(pFilterRecursive(list[i][node], predicate, node, context));
				}
			}
			return result;
		}

		function pEachRecursive(list, iteratee, node, context) {
			_.each(list, iteratee, context);
			for (var i = list.length - 1; i >= 0; i--) {
				if (list[i][node] && list[i][node].length > 0) {
					pEachRecursive(list[i][node], iteratee, node, context);
				}
			}
		}
	}
})();

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

(function () {
	'use strict';

	angular
		.module('prisma.services')
		.factory('tasksFactory', tasksFactory);

	tasksFactory.$inject = ['$log', '$q', '$http', 'helperService'];

	function tasksFactory ($log, $q, $http, helperService) {
		var service = {
			list: list,
			loadData: loadData,
			loadTabs: loadTabs,
		};

		return service;

		////////////////

		function list (moduleName, filter) {
			return $http.get('modules/' + moduleName + '/tasks', {
				params: helperService.formatFilter(filter),
				cache: true,
			}).catch(function (error) {
				$log.error('Couldn\'t load task list', error);
				return $q.reject(error);
			}).then(function (response) {
				if (!pValidateResponse(response))
					return $q.reject({statusText: 'Error when fetching tasks list.', status: 500});
				return response.data;
			});
		}

		function loadData (moduleName, task, filter) {
			return $http.get('modules/' + moduleName + '/tasks/' + task.id, {
				params: helperService.formatFilter(filter),
				cache: true,
			}).catch(function (error) {
				$log.error('Couldn\'t load task data', error);
				return $q.reject(error);
			}).then(function (response) {
				if (!pValidateResponse(response))
					return $q.reject({statusText: 'Error when fetching task data.', status: 500});
				return response.data;
			});
		}

		function loadTabs (moduleName, taskId) {
			return $http.get('modules/' + moduleName + '/tasks/' + taskId + '/supported-tabs', {
				cache: true,
			}).catch(function (error) {
				$log.error('Couldn\'t load supported tabs for task', error);
				return $q.reject(error);
			}).then(function (response) {
				if (!pValidateResponse(response))
					return $q.reject({statusText: 'Error when fetching supported tabs for task.', status: 500});
				return response.data;
			});
		}

		///////

		function pValidateResponse (response) {
			return (response !== undefined && response.data !== undefined)
		}
	}
})();
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

(function () {
	'use strict';

	angular
		.module('prisma.services')
		.service('omeroService', omeroService);

	omeroService.$inject = ['$rootScope'];

	function omeroService ($rootScope) {
    this.register = register;
    this.sendActionByInstanceId = function (instanceId, action, payload) {
      var instance = instances[instanceId];
      sendAction(instance, action, payload);
    };

    var instances = [];
    var initialized = false;
    var targetOrigin = '*';
    var messageContext = 'clovid_integration'; // shared "secret"

    if (!initialized) {
      init();
    }
		////////////////

    function register (element, handleEvent) {
      instances.push({
        el: element.get(0),
        eventHandler: handleEvent
      });
      return instances.length - 1;
    }

    function init () {
      initialized = true;
      window.addEventListener('message', handleMessage);
    }

    function handleMessage (event) {
      if (!event.data || !event.data.context || event.data.context !== messageContext) {
        return;
      }
      var omeroMessage = event.data
      var instance;
      for (var i = 0; i < instances.length; i++) {
        if (instances[i].el.contentWindow === event.source) {
          instance = instances[i];
          break;
        }
      }
      if (!instance) {
        return;
      }
      if (omeroMessage.type === 'event') {
        switch (omeroMessage.name) {
          case 'handshake':
            instance.viewerId = omeroMessage.params.iviewerid;
            sendEvent(instance, 'initialized');
            break;
          case 'VIEWER_INITIALIZED':
            sendEvent(instance, 'prepare');
            break;
          case 'annotations_loaded':
            sendAction(instance, 'hide_all_annotations');
            sendAction(instance, 'disable_interaction');
            break;
          case 'regions_created':
            sendAction(instance, 'enable_comments');
            break;
          case 'REGIONS_PROPERTY_CHANGED':
            var properties = omeroMessage.params.properties;
            if (properties && properties.length === 1 &&properties[0] === 'selected') {
              if (omeroMessage.params.shapes.length > 1) {
                console.log('Handle multiple shape selection');
              } else {
                var shapeId = omeroMessage.params.shapes[0];
                var event = {
                  name: omeroMessage.params.values[0] ? 'selected' : 'deselected',
                  resource: 'annotation',
                  resourceId: shapeId,
                }
                if (instance.eventHandler) {
                  instance.eventHandler(event);
			            $rootScope.$digest();
                }
              }
            }
            break;

          default:
            // console.log('iViewer event', {name: omeroMessage.name, params: omeroMessage.params})
            break;
        }
      }
    }

    function sendEvent(instance, name) {
      sendMessage(instance, 'event', name);
    }

    function sendAction(instance, name, payload) {
      sendMessage(instance, 'action', name, payload);
    }

    function sendMessage(instance, type, name, payload) {
      instance.el.contentWindow.postMessage(
        {
          context: messageContext,
          target: instance.viewerId,
          type: type,
          name: name,
          payload: payload,
        },
        targetOrigin
      );
    }
	}
})();

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

(function () {
	'use strict';

	angular
		.module('prisma.services')
		.factory('modulesFactory', modulesFactory);

	modulesFactory.$inject = ['$log', '$q', '$http', 'helperService'];

	function modulesFactory ($log, $q, $http, helperService) {
		var service = {
			index: index,
			countDatasets: countDatasets,
		};
		return service;

		////////////////

		function index () {
			return $http.get('modules').catch(function (error) {
				$log.error('Couldn\'t load modules', error);
				return $q.reject(error);
			}).then(function (response) {
				if (!pValidateResponse(response))
					return $q.reject({statusText: 'Error when fetching modules.', status: 500});
				return response.data;
			});
		}

		function countDatasets (module, filter) {
			var cancel = $q.defer();
			return $http.get('modules/' + module.name + '/count-datasets', {
				params: helperService.formatFilter(filter),
				timeout: cancel.promise,
				cancel: cancel,
				// cache: true,
			}).catch(function (error) {
				if (!error || error.status !== -1) {
					$log.error('Couldn\'t load datasets count', error);
				}
				return $q.reject(error);
			}).then(function (response) {
				if (!pValidateResponse(response))
					return $q.reject({statusText: 'Error when fetching datasets count.', status: 500});
				return response.data;
			});
		}

		///////

		function pValidateResponse (response) {
			return (response !== undefined && response.data !== undefined)
		}
	}
})();

(function () {
	'use strict';

	angular
		.module('prisma.services')
		.factory('loadingInterceptor', loadingInterceptor);

	loadingInterceptor.$inject = ['$rootScope', '$q'];

	function loadingInterceptor ($rootScope, $q) {
		var service = {
			request: request,
			response: response,
			responseError: responseError
		};
		return service;

		////////////////

		function request (config) {
			if (!config.noLoadingIndicator)
				$rootScope.$broadcast('loading:show');
			return config;
		}

		function response (response) {
			if (!response.config.noLoadingIndicator)
				$rootScope.$broadcast('loading:hide');
			return response;
		}

		function responseError (rejection) {
			if (!rejection.config.noLoadingIndicator)
				$rootScope.$broadcast('loading:hide');
			return $q.reject(rejection);
		}
	}
})();
(function () {
	'use strict';

	angular
		.module('prisma.services')
		.factory('$httpOneConcurrentRequestFactory', httpOneConcurrentRequestFactory);

	httpOneConcurrentRequestFactory.$inject = ['$http', '$cacheFactory'];

	function httpOneConcurrentRequestFactory ($http, $cacheFactory) {

		var cache = $cacheFactory('$httpOneConcurrentRequestFactory');

		return function $httpOneConcurrentRequestFactory(url, options) {
			return cache.get(url) || cache.put(url, $http.get(url, options)
				.then(function(response) {
					return response;
				})
				.finally(function () {
					cache.remove(url);
				}));
		};
	}
})();

(function () {
	'use strict';

	angular
		.module('prisma.services')
		.factory('httpErrorInterceptor', httpErrorInterceptor);

	httpErrorInterceptor.$inject = ['$rootScope', '$q'];

	function httpErrorInterceptor ($rootScope, $q) {
		var service = {
			responseError: responseError,
		};
		return service;

		////////////////

		function responseError (rejection) {
			if (!rejection.config.noHttpError) {
				var error;
				var context = {};
				switch (rejection.status) {

					case 401: // Unauthorized
						error = 'errors.unauthorized';
						break;

					case 403: // Forbidden
						error = 'errors.forbidden';
						break;

					case 404: // Not Found
						error = 'errors.notFound';
						context.url = rejection.config.url;
						break;

					case 405: // Method Not Allowed
						error = 'errors.methodNotAllowed';
						if (rejection.data !== undefined && rejection.data.error !== undefined) {
							error = rejection.data.error;
						}
						break;

					case 414: // Request-URI Too Large
						error = 'errors.filterToLarge';
						break;

					case 422: // Unprocessable entity
						error = 'errors.unprocessableEntity';
						// get first entity
						var entity = Object.keys(rejection.data)[0];
						if (entity !== undefined && rejection.data[entity] !== undefined)
							error = rejection.data[entity].toString();
						break;

					case 429: // Too many requests
						error = 'errors.tooManyRequests';
						break;

					case 500: // Internal server error
						error = 'errors.externalServer';
						break;

					case -1: // Aborted request
						error = undefined;
						break;

					default:
						error = rejection.statusText;

				}
				$rootScope.$broadcast('app-error', error, rejection.status, context);
			}
			return $q.reject(rejection);
		}
	}
})();

(function () {
	'use strict';

	angular
		.module('prisma.services')
		.service('helperService', helperService);

	helperService.$inject = [];

	function helperService () {
		this.comparatorFn = comparatorFn;
		this.formatFilter = formatFilter;
		this.handleHttpErrorFn = handleHttpErrorFn;
		this.handleHttpResponseFn = handleHttpResponseFn;

		////////////////

		/**
		 * Creates a new comparision function
		 * @param  {String} value
		 * @param  {Boolean} strict 	Strict comparison? If no, then task insensitive comparison
		 * @param  {String} property   	 Optional. If set, the value will matched agains this property
		 * @return {function}            [description]
		 */
		function comparatorFn (value, strict, property) {
			if (strict === undefined || strict === false) {
				var regExp = new RegExp(value, 'i')

				if (property === undefined)
					return function (item) {
						return item.search(regExp) !== -1;
					}

				return function (item) {
					return item.hasOwnProperty(property) && item[property].search(regExp) !== -1;
				}
			}

			if (property === undefined)
				return function (item) {
					return item.indexOf(value) !== -1;
				}
			return function (item) {
				return item.hasOwnProperty(property) && item[property].indexOf(value) !== -1;
			}
		}

		/**
		 * Formats the filter to work with the backend.
		 * Transforms the objects in the filter into relevant params.
		 * @param  {object} filter {users, timespans}
		 * @return {object}        params for GET query
		 */
		function formatFilter (filter) {
			var params = {};

			if (filter === undefined)
				return params;

			if (filter.users !== undefined){
				var cadsIds = [];
				for (var i = filter.users.length - 1; i >= 0; i--) {
					cadsIds = cadsIds.concat(filter.users[i].cadsIds);
				}
				params.cads_ids = cadsIds.join(',');
			}

			if (filter.timespans !== undefined) {
				for (var i = filter.timespans.length - 1; i >= 0; i--) {
					params['timespans[' + i + ']'] = filter.timespans[i][0].getTime() + ',' + filter.timespans[i][1].getTime();
				}
			}

			return params;
		}

		/**
		 * Creates an error function to handle a http error
		 * and uses an optional message.
		 * @param  {string|undefined} message
		 * @return {Rejection}
		 */
		function handleHttpErrorFn (message) {
			return function (error) {
				$log.error(message);
				var statusText = message;
				var status = 500;
				if (angular.isObject(error)) {
					// StatusText
					if (error.data && error.data.error) {
						statusText = error.data.error;
					} else if (error.statusText) {
						statusText = error.statusText;
					}
					// Status
					if (error.status) {
						status = error.status;
					}
				}
				return $q.reject({statusText: statusText, status: status});
			}
		}

		/**
		 * Generates a function that handles the result.
		 * In case of an error, it returns a rejection.
		 * In case of success, it returns the given responseKey of result.data.
		 * @param  {String} responseKey
		 * @return {Object|Array|rejection}
		 */
		function handleHttpResponseFn (responseKey) {
			return function (result) {
				if (result === undefined || result.data === undefined) {
					return $q.reject({statusText: 'Bad result', status: 500});
				}
				if (responseKey === undefined) {
					return result.data;
				}
				return result.data[responseKey];
			}
		}

	}
})();

(function () {
	'use strict';

	angular
		.module('prisma.services')
		.service('generalService', generalService);

	generalService.$inject = ['$log', '$http', '$q', '_'];

	function generalService ($log, $http, $q, _) {
		var service = this;

		service.config = config;

		////////////////

		function config (type, httpSettings) {
			httpSettings = httpSettings || {cache: true}
			return pConfig(httpSettings).then(function (config) {
				if (type === undefined)
					return config;
				if (config[type] === undefined)
					return $q.reject({statusText: 'Type not found in config!', status: 404});
				return config[type];
			})

		}

		////////////////

		function pConfig (httpSettings) {
			return $http.get('config', httpSettings).catch(function (error) {
				$log.error('Couldn\'t load config', error);
				return $q.reject(error);
			}).then(function (response) {
				if (response === undefined || response.data === undefined)
					return $q.reject({statusText: 'Error when fetching config.', status: 500});
				return response.data;
			});
		}

	}
})();
(function () {
	'use strict';

	angular
		.module('prisma.services')
		.service('filterService', filterService);

	filterService.$inject = ['$log', '$rootScope', '$localStorage'];

	function filterService ($log, $rootScope, $localStorage) {
		var service = this;

		service.setFilter = setFilter;
		service.getFilter = getFilter;
		service.resetFilter = resetFilter;

		service.setRawFilter = setRawFilter;
		service.getRawFilter = getRawFilter;

		service.isFilterSet = isFilterSet;

		var filterTemplate = {
			users: [], // [ 'name', 'cads_ids' ]
			timespans: [], // in ms
		};
		var filter;
		var rawFilter;
		var filterIsSet = false;

		function init () {
			loadFilterFromStorage();
		}
		////////////////

		function setFilter (newFilter) {
			filter = angular.extend({}, filterTemplate, newFilter);
			filterIsSet = true;
			$localStorage.filter = filter;
			$rootScope.$broadcast('update-filter');
		}

		function getFilter () {
			return filter;
		}

		function resetFilter () {
			setFilter({});
			setRawFilter(undefined);
			filterIsSet = false;
			$rootScope.$broadcast('reset-filter');
		}

		function setRawFilter (newRawFilter) {
			rawFilter = newRawFilter;
			$localStorage.rawFilter = rawFilter;
		}

		function getRawFilter () {
			return rawFilter;
		}

		function isFilterSet () {
			return filterIsSet;
		}

		function loadFilterFromStorage () {
			filter = $localStorage.filter;
			filterIsSet = !isFilterEmpty(filter);
			if (!filterIsSet)
				filter = filterTemplate;
			else {
				if (filter.timespans !== undefined)
					filter.timespans = _.map(filter.timespans, function (timespan) {
						return [
							new Date (timespan[0]),
							new Date (timespan[1]),
						]
					});
			}

			rawFilter = $localStorage.rawFilter;
			if (rawFilter !== undefined && rawFilter.date !== undefined)
				rawFilter.date = new Date (rawFilter.date);

		}

		function isFilterEmpty(filter) {
			return (!filter || (!filter.timespans && !filter.users)) ||
				(!filter.users && filter.timespans && !filter.timespans.length) ||
				(!filter.timespans && filter.users && !filter.users.length) ||
				(filter.users && !filter.users.length && filter.timespans && !filter.timespans.length);
		}

		init();
	}
})();

(function () {
	'use strict';

	angular
		.module('prisma.services')
		.service('cornerstoneService', cornerstoneService);

  cornerstoneService.$inject = [];

	function cornerstoneService () {
    this.register = register;
    this.sendActionByInstanceId = function (instanceId, action, payload) {
      var instance = instances[instanceId];
      sendAction(instance, action, payload);
    };

    var instances = [];
    var initialized = false;
    var targetOrigin = '*';
    var messageContext = 'cornerstone_viewer'; // shared "secret"

    if (!initialized) {
      init();
    }
		////////////////

    function register (element, handleEvent) {
      instances.push({
        el: element.get(0),
        eventHandler: handleEvent
      });
      return instances.length - 1;
    }

    function init () {
      initialized = true;
      window.addEventListener('message', handleMessage);
    }

    function handleMessage (event) {
      if (!event.data || !event.data.context || event.data.context !== messageContext) {
        return;
      }
      var message = event.data
      var instance;
      for (var i = 0; i < instances.length; i++) {
        if (instances[i].el.contentWindow === event.source) {
          instance = instances[i];
          break;
        }
      }
      if (!instance) {
        return;
      }
      if (message.type === 'event') {
        switch (message.name) {
          case 'handshake':
            instance.viewerId = message.params.viewerId;
            sendEvent(instance, 'initialized');
            break;
          default:
            console.log('cornerstone viewer event', {name: message.name, params: message.params});
            break;
        }
      }
    }

    function sendEvent(instance, name) {
      sendMessage(instance, 'event', name);
    }

    function sendAction(instance, name, payload) {
      sendMessage(instance, 'action', name, payload);
    }

    function sendMessage(instance, type, name, payload) {
      instance.el.contentWindow.postMessage(
        {
          context: messageContext,
          target: instance.viewerId,
          type: type,
          name: name,
          payload: payload,
        },
        targetOrigin
      );
    }
  }
})();

(function () {
	'use strict';

	angular
		.module('prisma.services')
		.service('accountsService', accountsService);

	accountsService.$inject = ['$log', '$http', '$q', '$httpOneConcurrentRequestFactory', '_', 'treeService', 'filterService'];

	function accountsService ($log, $http, $q, $httpOneConcurrentRequestFactory, _, treeService, filterService) {
		var vm = this;
		vm.getAccounts = getAccounts;
		vm.loadChildren = loadChildren;
		vm.getLeaves = getLeaves;

		vm.loadSelectedAccounts = loadSelectedAccounts;
		vm.resetSelectedAccounts = resetSelectedAccounts;
		vm.getSelectedAccountsAsPath = getSelectedAccountsAsPath;
		vm.getNamePathToAccount = getNamePathToAccount;

		vm.select = select;
		vm.deselect = deselect;
		vm.expand = expand;
		vm.collapse = collapse;

		vm.isSelected = isSelected;
		vm.isDeselected = isDeselected;
		vm.isInderterminate = isInderterminate;

		vm.accounts = [];
		vm.selectedAccounts = [];

		////////////////

		function getAccounts() {
			if (vm.accounts.length > 0) {
				return $q.resolve(vm.accounts);
			}
			return pGetRoot().then(function (accounts) {
				return vm.accounts = accounts;
			});
		}

		function loadChildren(account) {
			if (!account || account.isLeave) {
				return $q.reject([]);
			}
			if (account.children && account.children.length > 0) {
				return $q.resolve(account.children);
			}
			return pGetChildren(account)
				.then(function (children) {
					if (!angular.isArray(children)) {
						return [];
					}
					return children;
				})
				.then(treeService.setParentOfChildrenFn(account))
				.then(function (children) {
					return account.children = children;
				});
		}

		function getLeaves(account) {
			if (!account.id) {
				return $q.reject({statusText: 'getLeaves: Missing id for account.', status: 400});
			}
			return $http.get('api/account-leaves/' + account.id)
				.catch(function (error) {
					$log.error('Couldn\'t load account leaves', error, id);
					return $q.reject(error);
				})
				.then(function (result) {
					if (!result || !result.data)
						return $q.reject({statusText: 'Error when fetching account leaves.', status: 500});
					return result.data;
				});
		}

		// TODO: shouldn't be public, should be part of getAccounts
		function loadSelectedAccounts() {
			var filter = filterService.getRawFilter();
			if (
				!filter ||
				!filter.accounts ||
				!angular.isArray(filter.accounts) ||
				!filter.accounts.length
			) {
				return $q.resolve();
			}
			return getAccounts() // TODO: could be removed, when part of getAccounts
				.then(function (accountRoots) {
					var loadSelectedAccountsPromises = [];
					for (var i = 0; i < filter.accounts.length; i++) {
						var path = filter.accounts[i].split(',');
						var accountId = path.pop();
						loadSelectedAccountsPromises.push(
							pLoadChildrenForPath(path, accountRoots)
								.then(pSelectChildWithIdFn(accountId))
						)
					}
					return $q.all(loadSelectedAccountsPromises);
				})
				.then(function () {
					_.each(vm.selectedAccounts, pCheckIndeterminationForAncestors);
				});
		}

		function resetSelectedAccounts() {
			vm.selectedAccounts = [];
			treeService.eachRecursive(vm.accounts, function (account) {
				pSetDeselected(account);
			});
		}

		function getSelectedAccountsAsPath() {
			return _.chain(vm.selectedAccounts)
				.map(treeService.getPathToNode)
				.map(function (path) {
					return path.join();
				})
				.value();
		}

		function getNamePathToAccount(account) {
			return treeService.getPropertyPathToNode(account, 'name');
		}

		function select(account) {
			pSelectAccountAndChildren(account);
			pCheckIndeterminationForAncestors(account);
		}

		function deselect(account) {
			pDeselectAccountAndChildren(account);
			pCheckIndeterminationForAncestors(account);
		}

		function expand(account) {
			return loadChildren(account)
				.then(function (children) {
					if (isSelected(account)) {
						_.each(account.children, pSelectAccount);
					}
				});
		}

		function collapse(account) {
			if (isSelected(account)) {
				_.each(account.children, pDeselectAccount);
			}
			return $q.resolve();
		}

		function isSelected(account) {
			return account.status === 'selected';
		}

		function isDeselected(account) {
			return !account.status || account.status === 'deselected';
		}

		function isInderterminate(account) {
			return account.status === 'indeterminate';
		}

		////////////////

		function pGetRoot () {
			return $httpOneConcurrentRequestFactory('api/accounts/').catch(function (error) {
				$log.error('Couldn\'t load accounts (root)', error);
				return $q.reject(error);
			}).then(function (result) {
				if (!result || !result.data) {
					return $q.reject({statusText: 'Error when fetching accounts (root).', status: 500});
				}
				return result.data;
			});
		}

		function pGetChildren(account) {
			if (!account.id) {
				return $q.reject({statusText: 'pGetChildren: Missing id for account.', status: 400});
			}
			return $httpOneConcurrentRequestFactory('api/accounts/' + account.id).catch(function (error) {
				$log.error('Couldn\'t load children for account', error, account);
				return $q.reject(error);
			}).then(function (result) {
				if (!result || !result.data) {
					return $q.reject({statusText: 'Error when fetching accounts.', status: 500});
				}
				return result.data;
			});
		}

		function pLoadChildrenForPath(path, siblings) {
			if (path.length === 0) {
				return $q.resolve(siblings);
			}
			var currentLevel = path.shift();
			var node = _.findWhere(siblings, {id: currentLevel})
			if (!node) {
				return $q.resolve([]);
			}
			return loadChildren(node)
				.then(function (children) {
					return pLoadChildrenForPath(path, children);
				});
		}

		function pSelectChildWithIdFn(id) {
			return function (children) {
				for (var i = children.length - 1; i >= 0; i--) {
					if (children[i].id == id) {
						pSelectAccount(children[i]);
					}
				}
			}
		}

		function pCheckIndeterminationForAncestors(node) {
			if (!node || !node.parent) {
				return;
			}
			var numberOfSelectedChildren = _.filter(node.parent.children, isSelected).length
			var numberOfDeselectedChildren = _.filter(node.parent.children, isDeselected).length
			if (numberOfSelectedChildren === node.parent.children.length) {
				if (!isSelected(node.parent)) {
					pSelectAccount(node.parent);
				}
			} else if (numberOfDeselectedChildren === node.parent.children.length) {
				if (!isDeselected(node.parent)) {
					pDeselectAccount(node.parent);
				}
			} else {
				if (!isInderterminate(node.parent)) {
					pRemoveFromSelectedAccounts(node.parent);
					pSetIndeterminated(node.parent);
				}
			}
			pCheckIndeterminationForAncestors(node.parent);
		}

		function pSelectAccountAndChildren(account) {
			pSelectAccount(account);
			_.each(account.children, pSelectAccountAndChildren);
		}

		function pSelectAccount(account) {
			pSetSelected(account);
			vm.selectedAccounts.push(account);
		}

		function pDeselectAccountAndChildren(account) {
			pDeselectAccount(account);
			_.each(account.children, pDeselectAccountAndChildren);
		}

		function pDeselectAccount(account) {
			pSetDeselected(account);
			pRemoveFromSelectedAccounts(account);
		}

		function pRemoveFromSelectedAccounts(account) {
			vm.selectedAccounts = _.filter(vm.selectedAccounts, function (selectedAccount) {
				return selectedAccount.id !== account.id;
			});
		}

		function pSetSelected(account) {
			if (account) {
				account.status = 'selected';
			}
		}

		function pSetDeselected(account) {
			if (account) {
				account.status = 'deselected';
			}
		}

		function pSetIndeterminated(account) {
			if (account) {
				account.status = 'indeterminate';
			}
		}
	}
})();

(function() {
	'use strict';

	angular
		.module('prisma.run')
		.run(initialize);

	initialize.$inject = ['$log', '$http', '$rootScope', '$timeout', '$state', '$stateParams', 'toastFactory', '$auth', '$translate', 'userService'];
	function initialize ($log, $http, $rootScope, $timeout, $state,   $stateParams, toastFactory, $auth, $translate, userService) {

		$rootScope.$state = $state;
		$rootScope.$stateParams  = $stateParams;

		$rootScope.$loading = 0;
		$rootScope.$on('loading:show', function() {
			$rootScope.$loading++;
		});

		$rootScope.$on('loading:hide', function() {
			if ($rootScope.$loading > 0)
				$rootScope.$loading--;
		});

		$rootScope.$runningStateChanges = [];
		$rootScope.$on('$stateChangeStart', addRunningState);
		$rootScope.$on('$stateChangeStart', abortRunningRequests);
		$rootScope.$on('$stateChangeSuccess', removeRunningState);
		$rootScope.$on('$stateChangeError', removeRunningState);

		function addRunningState (event, toState, toParams, fromState, fromParams) {
			// Prevent multiple state changes to same state at the same time.
			if ($rootScope.$runningStateChanges.indexOf(toState.name) >= 0){
				$log.warn('Prevented state change because there is already an state change to the same name running.', toState);
				event.preventDefault();
				return;
			}
			$rootScope.$broadcast('loading:show');
			$rootScope.$runningStateChanges.push(toState.name);
		}

		function removeRunningState (event, toState, toParams, fromState, fromParams) {
			$rootScope.$broadcast('loading:hide');
			var stateIndex = $rootScope.$runningStateChanges.indexOf(toState.name);
			if (stateIndex >= 0)
				$rootScope.$runningStateChanges.splice(stateIndex, 1);
		}

		function abortRunningRequests(event, toState, toParams, fromState, fromParams) {
			$http.pendingRequests.forEach(function(request) {
				if (request.cancel) {
					console.log('cancel request', request);
					request.cancel.resolve();
				}
			});
		}

		var visibleError;
		$rootScope.$on('app-error', function(event, error, errorStatus, context) {
			if (error !== undefined && visibleError !== error) {
				visibleError = $translate.instant(error, context);
				toastFactory.show(visibleError)
					.catch(function () { return; })
					.then(function () { visibleError = undefined; });
			}

			if ((errorStatus === 401 || errorStatus === 403) && $state.current.name !== 'login'){
				$timeout(function () {
					$log.info('Logout because of 401 or 403 error', error);
					userService.logout({noHttpError: true})
						.catch(function () { return; })
						.finally(function () {
							$rootScope.$broadcast('loading:hide');
							$state.go('login');
						});
				});
			}
		});
	}
})();

(function() {
    'use strict';

    angular
        .module('prisma.config')
        .config(routes);

    routes.$inject = ['$stateProvider', '$urlRouterProvider'];
    function routes ($stateProvider, $urlRouterProvider) {

        var getView = function( viewName ){
            return 'views/app/' + viewName + '/' + viewName + '.html';
        };

        $urlRouterProvider.otherwise(function ($injector, $location) {
            // "Future" state implementation to load supported tabs when
            // reloading within a modules task tab.
            // We land here, because none of the other (static) states matched.

            // 1. Check if we want to load a task tab of an module
            // e.g. /modules/medforge/12/laboratory
            var path = $location.path().split('/');
            if (path[1] != 'modules' || path.length != 5)
                return '/login';

            // 2. Build url to task and set the intended tab as parameter
            var wantedTab = path.pop();
            var url = path.join('/')  + '/?goto=' + wantedTab;
            return url;
        });

        $stateProvider
        .state('login', {
            url: '/login',
            templateUrl: getView('login'),
            controller: 'LoginController as ctrl',
        })
        .state('home', {
            url: '/',
            templateUrl: getView('home'),
            controller: 'HomeController as homeCtrl',
            onEnter: ['userService', function (userService) {
                userService.startLoginTestHandler();
            }],
            onExit: ['userService', function (userService) {
                userService.stopLoginTestHandler();
            }],
        })
        .state('module', {
            url: '/modules/{module}',
            abstract: true,
            templateUrl: getView('module'),
            controller: 'ModuleController as modCtrl',
            resolve: {
                module: ['$log', '$q', '$stateParams', 'modulesService', function ($log, $q, $stateParams, modulesService) {
                    return modulesService.selectByName($stateParams.module).catch(function (error) {
                        $log.error('Error when resolving module state', error);
                        return $q.reject(error);
                    });
                }],
                taskList: ['module', 'tasksService', function (module, tasksService) {
                    return tasksService.getFilteredList(module.name).catch(function (error) {
                        if (error && error.status === 500) {
                            return undefined;
                        }
                        return $q.reject(error);
                    });
                }],
                privacyConfig: ['generalService', function (generalService) {
                    return generalService.config('privacy').catch(function () {
                        return {};
                    })
                }]
            },
            onEnter: ['userService', function (userService) {
                userService.startLoginTestHandler();
            }],
            onExit: ['userService', function (userService) {
                userService.stopLoginTestHandler();
            }],
        })
        .state('module.tasks', {
            url: '/',
            templateUrl: getView('module-tasks')
        })
        .state('module.task', {
            url: '/{id}/',
            templateUrl: getView('module-task'),
            controller: 'ModuleTaskController as mtCtrl',
            resolve: {
                task: ['$log', 'module', 'taskList', '$stateParams', 'tasksService', 'toastFactory', function ($log, module, taskList, $stateParams, tasksService, toastFactory) {
                    if (!taskList) {
                        $log.error('Error when resolving task state (no taskList)', error);
                        return;
                    }
                    return tasksService.selectById(module.name, $stateParams.id).catch(function (error) {
                        $log.error('Error when resolving task state', error);
                        if (error && error.status === 410) {
                            tasksService.closeTaskById($stateParams.id);
                            toastFactory.show('Der Fall existiert nicht und wurde geschlossen');
                        }
                        return;
                    });
                }],
                supportedTabs: ['$log', 'module', 'task', 'tasksService', function ($log, module, task, tasksService) {
                    if (!task) {
                        $log.error('Error when resolving supported tabs (no task)', error);
                        return;
                    }
                    return tasksService.getSupportedTabs(module.name, task).catch(function (error) {
                        $log.error('Error when resolving supported tabs', error);
                        return;
                    });
                }],
            }
        })
        .state('admin', {
            url: '/admin/',
            abstract: true,
            templateUrl: getView('admin'),
            onEnter: ['userService', function (userService) {
                userService.startLoginTestHandler();
            }],
            onExit: ['userService', function (userService) {
                userService.stopLoginTestHandler();
            }],
        })
        .state('admin.users', {
            url: 'users/',
            templateUrl: getView('admin-users'),
            controller: 'AdminUsersController as ctrl',
        });
    }
})();

(function() {
	'use strict';

	angular
		.module('prisma.providers')
		.provider('tabsProvider', tabsProvider);

	tabsProvider.$inject = ['$stateProvider'];
	function tabsProvider ($stateProvider) {
		this.$get = function () {
			return {
				add: function (name, template, controllerAs) {
					var stateConfig = {
						url: name,
						views: {},
					};
					stateConfig.views[name] = {templateUrl: 'views/app/module-tabs/' + template + '.html'};
					if (controllerAs) {
						stateConfig.views[name].controller = controllerAs;
					}

					$stateProvider.state('module.task.' + name, stateConfig);
				}
			}
		};
	}
})();

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

(function () {
	'use strict';

	angular
		.module('prisma.directives')
		.directive('ldTimeInput', ldTimeInput);

	ldTimeInput.$inject = [];

	function ldTimeInput () {
		// Usage:
		//
		// Creates:
		//
		var directive = {
			bindToController: true,
			controller: Controller,
			controllerAs: 'vm',
			templateUrl: 'views/directives/time-input/time-input.html',
			restrict: 'EA',
			scope: {
				value: '='
			}
		};
		return directive;
	}

	Controller.$inject = ['$scope', '_'];

	function Controller ($scope, _) {

		var vm = this;

		vm.$onInit = function() {
			// Regular expression for 24-hour time designation
			var timeRegExp = new RegExp('([0-1][0-9]|2[0-3]):[0-5][0-9]');

			vm.valueToText = valueToText;
			vm.textToValue = textToValue;
		}

		/**
		 * Time value to text presentation
		 * @param  {int} value time in milliseconds (of the day)
		 * @return {string} HH:mm
		 */
		function valueToText(value) {
			var seconds = Math.floor(value / 1000);

			var hours = Math.floor(seconds / 3600);
			if (hours < 10)
				hours = '0' + hours;
			var minutes = Math.floor((seconds % 3600) / 60);
			if (minutes < 10)
				minutes = '0' + minutes;

			return hours + ':' + minutes;
		}

		/**
		 * Formats the textual representation of a 24-hour-clock time into milliseconds
		 * @param  {string|date} time HH:mm
		 * @return {int|null} time in milliseconds
		 */
		function textToValue(text) {
			if (text === undefined || text === '')
				return null;

			var time = 0;
			if (_.isDate(text)) {
				time = text.getTime();
				if (text.getTimezoneOffset() !== 0)
					time = time + (text.getTimezoneOffset() * -1 * 60 * 1000);
			} else {
				if (!timeRegExp.test(text))
					return null;
				var value = text.split(':');
				time = (value[0] * 60 + value[1] * 1) * 60 * 1000;
			}

			return vm.value = time;
		}

	}
})();

(function () {
	'use strict';

	angular
		.module('prisma.directives')
		.directive('ldSimpleTree', ldSimpleTree);

	ldSimpleTree.$inject = [];

	function ldSimpleTree () {
		var directive = {
			bindToController: true,
			controller: Controller,
			controllerAs: 'vm',
			templateUrl: 'views/directives/simple-tree/simple-tree.html',
			scope: {
				items: '=',
				selectedItems: '=',
				childrenNode: '@?',
				search: '=',
				onlyLeaves: '@?',
				singleChoice: '@?',
				titleProperty: '@?',
				disabledProperty: '@?',
			}
		};
		return directive;
	}

	Controller.$inject = ['$filter', '$scope', '_', 'helperService', 'treeService'];

	function Controller ($filter, $scope, _, helperService, treeService) {
		var vm = this;

		vm.$onInit = function () {
			methods();
			variables();
			listeners();
		}

		// All public methods of this controller
		function methods () {
			vm.query = query;
			vm.toggleSelection = toggleSelection;
			vm.toggleOpen = toggleOpen;
		}

		// All public variables of this controller
		function variables () {
			vm.selectedItems = initSelection(vm.selectedItems);
			vm.originalItems = vm.items;
			// set defaults
			vm.childrenNode = vm.childrenNode || 'items';
			vm.onlyLeaves = vm.onlyLeaves || true;
			vm.singleChoice = vm.singleChoice || false;
			vm.titleProperty = vm.titleProperty || 'name';
			vm.disabledProperty = vm.disabledProperty || 'disabled';
		}

		// All listeners/watchers of this controller
		function listeners () {
			$scope.$watch('vm.search', query);
		}

		//////////////////////
		/// Public methods ///
		//////////////////////

		/**
		 * Updates the tree depending on the query.
		 * It compares the <text> with the <titleProperty>
		 * of each element of the <items> list
		 * @param  {String} text
		 * @return {undefined}
		 */
		function query (text) {
			if (text === undefined || typeof text !== 'string' || text.length < 2)
				vm.items = vm.originalItems;
			else
				vm.items = treeService.filterRecursive(vm.originalItems, helperService.comparatorFn(text, false, vm.titleProperty), 'children');
		}

		/**
		 * Toggles the 'selected' property of the given item.
		 * If only leaves can be selected and the item has children
		 * it doesn't toggles the selected property but toggles
		 * the 'open' property of the item expand/collapse its children
		 * @param  {Object} item
		 * @return {undefined}
		 */
		function toggleSelection (item) {
			if (item === undefined)
				return;

			if (vm.onlyLeaves && item[vm.childrenNode] && item[vm.childrenNode].length > 0)
				return toggleOpen(item);

			if (item.selected === true) {
				item.selected = false;
				if (vm.singleChoice) {
					vm.selectedItems = undefined;
				} else {
					vm.selectedItems = $filter('filter')(vm.selectedItems, {id: '!' + item.id});
				}
			} else {
				item.selected = true;
				if (vm.singleChoice) {
					toggleSelection(vm.selectedItems);
					vm.selectedItems = item;
				} else {
					vm.selectedItems.push(item);
				}
			}
		}

		/**
		 * Preselects the given item(s) recursively in the tree (vm.items).
		 * Apart from making sure that the selected property of the given items is true,
		 * we need to get the given items from the tree, to get the correct $$hash property.
		 * @param  {Array|Object} items depending on <vm.singleChoice>
		 * @return {Array|Object} item(s)
		 */
		function initSelection (items) {
			if (items === undefined)
				return;
			if (vm.singleChoice)
				return treeService.filterRecursive(vm.items, function (item) { return items.id === item.id; })[0];

			var selectedItems = [];
			for (var i = 0; i < items.length; i++) {
				var selectedItem = treeService.filterRecursive(vm.items, function (item) { return items[i].id === item.id; })[0];
				if (selectedItem === undefined)
					continue;
				if (selectedItem.selected !== true)
					selectedItem.selected = true;
				selectedItems.push(selectedItem);
			}
			return selectedItems;
		}

		/**
		 * Toggles the 'open' property of the given item.
		 * @param  {Object} item
		 * @return {undefined}
		 */
		function toggleOpen(item) {
			if (item === undefined)
				return;
			if (!item.open)
				open(item);
			else
				close(item);
		}

		/**
		 * Sets the open attribute of the given item to true.
		 * @param  {Object} item
		 * @return {undefined}
		 */
		function open(item) {
			if (!item.open)
				item.open = true;
		}

		/**
		 * Sets the open attribute of the given item to false.
		 * @param  {Object} item
		 * @return {undefined}
		 */
		function close(item) {
			if (item.open)
				item.open = false;
		}
	}
})();

(function () {
	'use strict';

	angular
		.module('prisma.directives')
		.directive('ldNavigationMenu', ldNavigationMenu);

	ldNavigationMenu.$inject = [];

	function ldNavigationMenu () {
		// Usage:
		//
		// Creates:
		//
		var directive = {
			bindToController: true,
			controller: Controller,
			controllerAs: 'vm',
			restrict: 'A',
			templateUrl: 'views/directives/navigation-menu/navigation-menu.html',
		};
		return directive;
	}

	Controller.$inject = ['$rootScope', '$log', '$q', '$state', '$translate', 'userService'];

	function Controller ($rootScope, $log, $q, $state, $translate, userService) {
		var vm = this;

		vm.$onInit = function() {
			userService.user().then(function (user) {
				vm.user = user;
			});

			$rootScope.$on('$translateChangeSuccess', function () {
				vm.lang = $translate.use();
			});

			vm.logout = logout;
			vm.lang = $translate.use();
			vm.availableLangs = $translate.getAvailableLanguageKeys();
			vm.selectLang = selectLang;
		}

		function logout () {
			userService.logout({noHttpError: true}).catch(function (error) {
				if (!angular.isObject(error) || error.status !== 401) {
					$log.warn('Couldn\'t logout the user serverside but we go to login anyway', error);
					return;
				}
				$log.warn('Couldn\'t logout the user serverside', error);
				return $q.reject(error);
			}).then(function () {
				$state.go('login');
			})
		}

		function selectLang (lang) {
			$translate.use(lang);
		}

	}
})();

(function () {
	'use strict';

	angular
		.module('prisma.directives')
		.directive('ldImage', ldImage);

	ldImage.$inject = ['$timeout'];

	function ldImage ($timeout) {
		// Usage:
		//
		// Creates:
		//
		var directive = {
			bindToController: true,
			controller: Controller,
			controllerAs: 'vm',
			restrict: 'A',
			templateUrl: 'views/directives/image/image.html',
			scope: {
				image: '='
			},
			link: link,
		};
		return directive;

		function link (scope, element, attrs) {
			if (['meta', 'wsi'].includes(scope.vm.image.type)) {
				$timeout(function () {
					var iframe = element.find('iframe');
					scope.vm.registerIframe(iframe, scope.vm.image.type);
				});
			}
			element.bind('keydown keypress', function (event) {
				var keyLeft = 37;
				var keyRight = 39;
				if (event.which === keyLeft) {
					scope.vm.showPreviousSlice();
				}
				if (event.which === keyRight) {
					scope.vm.showNextSlice();
				}
			});
		}
	}

	Controller.$inject = ['$log', '$rootScope', '$scope', '$timeout', 'userService', 'omeroService', 'cornerstoneService'];

	function Controller ($log, $rootScope, $scope, $timeout, userService, omeroService, cornerstoneService) {
		var vm = this;
		var activeSlice;

		vm.$onInit = function() {
			var activeSlice = vm.image.slices && vm.image.slices[vm.image.currentSlice];
			vm.state = {
				image: {
					visible: false,
					activeSlice: activeSlice,
					url: getUrl(vm.image, activeSlice),
					title: vm.image.title,
				},
				overlay: {
					visible: false,
					activeSlice: null,
					url: null,
					style: {},
				},
				marks: {
					data: [],
					visible: false,
				},
				questionId: null,
				debounceTimeouts: {},
			};
			vm.config = {
				invertMouseWheel: true,
				zoomLevels: 6,
				scalePerZoomLevel: 1.8,
				// TODO: what should be the neutral zoom level?
				neutralZoomLevel: 1,
				initialZoomToFit: {
					x: 0,
					y: 0,
					// TODO: other orientation
					width: vm.image.dimensions && vm.image.dimensions.x,
					height: vm.image.dimensions && vm.image.dimensions.y,
				},
				debounceTime: {
					updateUrl: 100,
					activateOverlay: 100,
				},
			};
			vm.model = {};
			vm.onMousedown = onMousedown;
			vm.showPreviousSlice = showPreviousSlice;
			vm.showNextSlice = showNextSlice;
			vm.registerIframe = registerIframe;
		}

		vm.$onDestroy = function() {
			vm.image.active = false;
		}

		function registerIframe(element, imageType) {
			if (imageType === 'wsi') {
				vm.state.image.iframeId = omeroService.register(element, handleEvent);
			}
			if (imageType === 'meta') {
				vm.state.image.iframeId = cornerstoneService.register(element, handleEvent);
			}
		}

		function handleEvent(event) {
			console.log('Handle event from iframe', event);
			if (event.resource === 'annotation') {
				var message = event.name === 'deselected' ? 'deselected-mark' : 'selected-mark';
				$rootScope.$broadcast(message, {
					imageId: vm.image.id,
					questionId: vm.state.questionId,
					mark: event.resourceId,
				});
			}
		}

		function getUrl(image, slice) {
			if (!slice || !slice.hash) {
				if (!image.url) {
					return;
				}
				return image.url + '?user_ticket=' + userService.token();
			}
			return 'images/' + slice.hash + '?user_ticket=' + userService.token();
		}

		$scope.$on('change-image', function (event, config) {
			if (config.imageId !== vm.image.id) {
				vm.image.active = false;
				// hide overlay
				if (vm.state.overlay.visible) {
					$rootScope.$broadcast('hide-overlay', {
						imageId: vm.image.id,
						questionId: vm.state.questionId,
						skipActivation: true,
					});
				}
				// hide marks
				if (vm.state.marks.visible) {
					$rootScope.$broadcast('hide-marks', {
						imageId: vm.image.id,
						questionId: vm.state.questionId,
						skipActivation: true,
					});
				}
				return;
			}
			vm.image.active = true;
		});

		$scope.$on('show-marks', function (event, config) {
			if (config.imageId !== vm.image.id || (vm.state.questionId && config.questionId !== vm.state.questionId)) {
				resetOverlayAndMarks();
			}
			performAction('show', 'marks', config);
		});

		$scope.$on('deselect-mark', function (event, config) {
			performAction('deselect', 'mark', config);
		});

		$scope.$on('select-mark', function (event, config) {
			performAction('select', 'mark', config);
		});

		$scope.$on('zoom-mark', function (event, config) {
			performAction('zoom', 'mark', config);
		});

		$scope.$on('hide-marks', function (event, config) {
			performAction('hide', 'marks', config);
		});

		$scope.$on('show-overlay', function (event, config) {
			if (config.imageId !== vm.image.id || (vm.state.questionId && config.questionId !== vm.state.questionId)) {
				resetOverlayAndMarks();
			}
			performAction('show', 'overlay', config);
		});

		$scope.$on('hide-overlay', function (event, config) {
			performAction('hide', 'overlay', config);
		});

		function showSlice(slice) {
			if (vm.state.image.activeSlice === slice) {
				return;
			}
			performAction('show', 'slice', {
				imageId: vm.image.id,
				slice: slice,
			});
		}

		function showPreviousSlice() {
			if (vm.state.image.activeSlice.i <= 0) {
				return;
			}
			showSlice(vm.image.slices[vm.state.image.activeSlice.i - 1]);
			$scope.$apply();
		}

		function showNextSlice() {
			if (vm.state.image.activeSlice.i + 1 >= vm.image.slices.length) {
				return;
			}
			showSlice(vm.image.slices[vm.state.image.activeSlice.i + 1]);
			$scope.$apply();
		}

		function performAction(action, resource, config) {
			if (!config.imageId || config.imageId !== vm.image.id) {
				if (!config.skipActivation) {
					vm.image.active = false;
				}
				return;
			}

			if (!config.skipActivation) {
				vm.image.active = true;
			}

			if (config.skipUpdate === false) {
				return;
			}

			if (!config.questionId) {
				// $log.error('Question ID missing', action, resource, config);
			}

			if (resource === 'marks') {
				if (action === 'show') {
					if (!config.marks || config.marks.length <= 0) {
						return;
					}
					vm.state.marks.data = config.marks;
					vm.state.marks.visible = true;
					vm.state.questionId = config.questionId;
					// add marks to slices
					// todo refactor for other orientation than z

					if (vm.image.type === 'wsi') {
						var marks = _.map(vm.state.marks.data, function (item) { return item.id; });
						omeroService.sendActionByInstanceId(vm.state.image.iframeId, 'show_annotations', {annotationIds: marks});
						omeroService.sendActionByInstanceId(vm.state.image.iframeId, 'zoom_to_annotations', {annotationIds: marks});
					} else if (vm.image.type === 'meta') {
						cornerstoneService.sendActionByInstanceId(vm.state.image.iframeId, 'show_points', {points: config.marks.map(({x,y,z}) => [x,y,z])});
					} else {
						var groupedMarks = _.reduce(config.marks, function (carry, item) {
							if (!carry[item[2]]) {
								carry[item[2]] = [];
							}
							carry[item[2]].push([item[0], item[1]]);
							return carry;
						}, {});
						_.each(groupedMarks, function (marks, key) {
							vm.image.slices[key].marks = marks;
						});

						if (vm.state.image.activeSlice.marks) {
							drawPlot(vm.state.marks.data, vm.state.image.activeSlice.i, vm.image.orientation);
						} else {
							var nearestGroupIndex = _.min(Object.keys(groupedMarks), function (index) {
								return Math.abs(vm.state.image.activeSlice.i - index);
							});
							var validSlice = vm.image.slices[nearestGroupIndex];
							performAction('show', 'slice', _.extend({}, config, {slice: validSlice}));
						}
					}
				} else {
					if (!vm.state.overlay.visible) {
						vm.state.questionId = null;
					}
					if (vm.state.marks.visible) {
						if (vm.image.type === 'wsi') {
							var marks = _.map(vm.state.marks.data, function (item) { return item.id; });
							omeroService.sendActionByInstanceId(vm.state.image.iframeId, 'hide_annotations', {annotationIds: marks});
						} else if (vm.image.type === 'meta') {
							cornerstoneService.sendActionByInstanceId(vm.state.image.iframeId, 'hide_points');
						} else {
							_.each(vm.image.slices, function (slice) {
								if (slice.marks) {
									slice.marks = undefined;
								}
							});
							hidePlot();
						}
					}
					vm.state.marks.visible = false;
				}
			}

			if (resource === 'mark') {
				if (action === 'deselect') {
					if (vm.image.type === 'wsi') {
						omeroService.sendActionByInstanceId(vm.state.image.iframeId, 'deselect_annotation', {annotationId: config.mark});
					} else if (vm.image.type === 'meta') {
						console.log('TODO: implement deselect-mark for meta images');
					} else {
						console.log('TODO: implement deselect-mark for images other that wsi');
					}
				}
				if (action === 'select') {
					if (vm.image.type === 'wsi') {
						omeroService.sendActionByInstanceId(vm.state.image.iframeId, 'pan_to_annotation', {annotationId: config.mark, select: true});
					} else if (vm.image.type === 'meta') {
						console.log('TODO: implement select-mark for meta images');
					} else {
						console.log('TODO: implement select-mark for images other that wsi');
					}
				}
				if (action === 'zoom') {
					if (vm.image.type === 'wsi') {
						omeroService.sendActionByInstanceId(vm.state.image.iframeId, 'zoom_to_annotation', {annotationId: config.mark, select: true});
					} else if (vm.image.type === 'meta') {
						console.log('TODO: implement zoom-mark for meta images');
					} else {
						console.log('TODO: implement zoom-mark for images other that wsi');
					}
				}
			}

			if (resource === 'overlay') {
				if (action === 'show') {
					if (!config.overlayId) {
						$log.error('Overlay ID missing:', action, resource, config, vm.image);
						return;
					}
					if (['wsi', 'meta'].includes(vm.image.type)) {
						var overlaySlice = config.overlayId;
					} else {
						var overlaySlice = _.findWhere(vm.state.image.activeSlice.overlays, {id: config.overlayId});
						if (!overlaySlice) {
							var currentIndex = vm.state.image.activeSlice.i;
							var overlayConfig = _.findWhere(vm.image.overlays, {id: config.overlayId});
							if (!overlayConfig) {
								$log.error('Overlay ID wrong:', action, resource, config, vm.image.overlays);
								return;
							}
							var offset = overlayConfig.offset[vm.image.orientation];
							var dimension = overlayConfig.dimensions[vm.image.orientation];
							if (currentIndex >= offset && currentIndex <= dimension + offset) {
								$log.error('Overlay not available:', action, resource, config, vm.state.image.activeSlice);
								return;
							}
							var validSliceIndex = Math.round(offset + (dimension / 2));
							var validSlice = vm.image.slices[validSliceIndex];
							performAction('show', 'slice', _.extend({}, config, {slice: validSlice}));
							overlaySlice = _.findWhere(vm.state.image.activeSlice.overlays, {id: config.overlayId});
						}
					}
					showOverlay(overlaySlice, config.questionId);
				} else {
					hideOverlay();
				}
			}

			if (resource === 'slice') {
				if (action === 'show') {
					if (!config.slice) {
						$log.error('Slice missing:', action, resource, config, vm.image);
						return;
					}
					debounce('updateUrl', function () { updateUrl(config.slice); }, vm.config.debounceTime.updateUrl);
					vm.state.image.activeSlice = config.slice;
					if (vm.state.overlay.activeSlice) {
						var overlay = _.findWhere(vm.state.image.activeSlice.overlays, {id: vm.state.overlay.activeSlice.id});
						debounce('activateOverlay', function () { activateOverlay(overlay) }, vm.config.debounceTime.activateOverlay);
					}
					if (vm.state.marks.visible) {
						hidePlot();
						var visiblePoints = _.filter(vm.state.marks.data, function (mark) {
							return getOpacity(vm.state.image.activeSlice.i, mark[2]) > 0.1;
						});
						if (visiblePoints.length > 0) {
							drawPlot(visiblePoints, vm.state.image.activeSlice.i, vm.image.orientation);
						}
					}
				}
			}
		}

		function updateUrl(imageSlice) {
			var newUrl = getUrl(vm.state.image, imageSlice);
			if (!newUrl || vm.state.image.url === newUrl)
				return;
			vm.state.image.url = newUrl;
		}

		function showOverlay(overlaySlice, questionId) {
			activateOverlay(overlaySlice);
			vm.state.overlay.visible = true;
			vm.state.questionId = questionId;
		}

		function activateOverlay(overlaySlice) {
			if (vm.state.overlay.activeSlice === overlaySlice) {
				return;
			}
			if (!overlaySlice) {
				vm.state.overlay.url = null;
				return;
			}

			if (vm.image.type === 'wsi') {
				vm.state.overlay.annotationId = overlaySlice;
				omeroService.sendActionByInstanceId(vm.state.image.iframeId, 'show_annotations', {annotationIds: overlaySlice.split(',')});
			} else if (vm.image.type === 'meta') {
				vm.state.overlay.annotationId = overlaySlice;
				cornerstoneService.sendActionByInstanceId(vm.state.image.iframeId, 'show_overlay', {overlayId: overlaySlice});
			} else {
				vm.state.overlay.activeSlice = overlaySlice;
				var overlayUrl = getUrl(vm.state.image, overlaySlice);
				if (!overlayUrl || vm.state.overlay.url === overlayUrl)
					return;
				var overlayConfig = _.findWhere(vm.image.overlays, {id: overlaySlice.id});
				vm.state.overlay.url = overlayUrl;
				vm.state.overlay.style = {
					// TODO: other orientation
					top: overlayConfig.offset.y,
					left: overlayConfig.offset.x,
				}
			}
		}

		function hideOverlay() {
			vm.state.overlay.visible = false;
			if (!vm.state.marks.visible) {
				vm.state.questionId = null;
			}

			if (vm.image.type === 'wsi' && vm.state.overlay.annotationId) {
				omeroService.sendActionByInstanceId(vm.state.image.iframeId, 'hide_annotations', {annotationIds: vm.state.overlay.annotationId.split(',')});
				vm.state.overlay.annotationId = null;
			}
			if (vm.image.type === 'meta' && vm.state.overlay.annotationId) {
				cornerstoneService.sendActionByInstanceId(vm.state.image.iframeId, 'hide_overlay', {overlayId: vm.state.overlay.annotationId});
			}
		}

		function resetOverlayAndMarks() {
			if (vm.state.overlay.visible) {
				performAction('hide', 'overlay', {
						imageId: vm.image.id,
						questionId: vm.state.questionId,
						skipActivation: true,
				});
			}
			if (vm.state.marks.visible) {
				performAction('hide', 'marks', {
						imageId: vm.image.id,
						questionId: vm.state.marks.questionId,
						skipActivation: true,
				});
			}
		}

		function drawPlot (marks, currentIndex, orientation) {
			marks = marks || [];

			if (marks.length === 0) {
				return;
			}

			// TODO: what about z?
			var circleRadius = Math.round(Math.min(vm.image.dimensions.x, vm.image.dimensions.y) / 90);
			var borderWidth = 1;
			var width = _.max(marks, function (mark) { return mark[0]; })[0] + circleRadius + borderWidth;
			var height = _.max(marks, function (mark) { return mark[1]; })[1] + circleRadius + borderWidth;

			var el = d3.select('#ld-image-' + vm.image.id + ' .js-map');

			var map = el.append('svg')
				.attr('width', width)
				.attr('height', height);

			// Define the div for the tooltip
			var div = el.append('div')
				.attr('class', 'tooltip')
				.style('opacity', 0);

			map.append('image')
				.attr('width', width)
				.attr('height', height);

			map.selectAll('.hotspot')
				.data(
					marks.map(function (mark) {
						return {
							coordinates: mark,
							opacity: getOpacity(currentIndex, mark[2]),
						};
					})
				)
				.enter().append('circle')
					// .on('mouseover', function (d) {
					// 	div.transition()
					// 		.duration(200)
					// 		.style('opacity', .9);
					// 	div.html(d.size + ' Datensätze')
					// 		.style('left', d.coordinates[0] + (d.size * 10) + 10 + 'px')
					// 		.style('top', d.coordinates[1] - (d.size * 10) + 'px');
					// })
					// .on('mouseout', function (d) {
					// 	div.transition()
					// 		.duration(200)
					// 		.style('opacity', 0);
					// })
					.attr('class', 'hotspot')
					// .attr('r', 50)
					.each(function (d) {
						d3.select(this)
							.attr('cx', d.coordinates[0])
							.attr('cy', d.coordinates[1])
							.attr('r', circleRadius)
							.style('fill', 'red')
							.style('stroke', 'white')
							.style('opacity', d.opacity);
					});

		}

		function hidePlot() {
			var el = d3.select('#ld-image-' + vm.image.id + ' .js-map');
			el.select('svg').remove();
		}

		function onMousedown(event, slice) {
			showSlice(slice);
			var scrollbarElement = $(event.target).parent();
			scrollbarElement.children().on('mousemove', onMousemove);
			scrollbarElement.on('mouseup', onMouseupFn(scrollbarElement));
			scrollbarElement.on('mouseleave', onMouseleaveFn(scrollbarElement));
		}

		function onMousemove(event) {
			var slice = $(event.target).scope().slice;
			if (vm.state.image.activeSlice !== slice) {
				showSlice(slice);
				$scope.$apply();
			}
			event.stopPropagation();
			event.preventDefault();
		}

		function onMouseupFn(element) {
			return function (event) {
				// remove onMousemove
				element.children().off('mousemove');
				element.off('mouseup');
				element.off('mouseleave');
			}
		}

		function onMouseleaveFn(element) {
			var onMouseup = onMouseupFn(element);
			return function (event) {
				onMouseup(event);
			}
		}

		function getOpacity(currentIndex, pointIndex) {
			var distance = Math.abs(currentIndex - pointIndex);
			return distance > 0 ? ( 1 / (1.5 * distance)) : 0.9
		}

		function debounce(action, func, wait, invokeApply) {
			wait = wait || 100;
			if (vm.state.debounceTimeouts[action]) {
				$timeout.cancel(vm.state.debounceTimeouts[action]);
			}
			vm.state.debounceTimeouts[action] = $timeout(func, wait, invokeApply);
		}

	}
})();

(function () {
	'use strict';

	angular
		.module('prisma.directives')
		.directive('ldFilterSummary', ldFilterSummary);

	ldFilterSummary.$inject = [];

	function ldFilterSummary () {
		// Usage:
		//
		// Creates:
		//
		var directive = {
			bindToController: true,
			controller: Controller,
			controllerAs: 'vm',
			restrict: 'A',
			templateUrl: 'views/directives/filter-summary/filter-summary.html',
			scope: {
			}
		};
		return directive;
	}

	Controller.$inject = ['$log', '$scope', '$rootScope', 'filterService'];

	function Controller ($log, $scope, $rootScope, filterService) {
		var vm = this;

		vm.$onInit = function() {
			methods();
			variables();
			listeners();

			setDefaults();
		}

		function methods () { }

		function variables () {
			vm.options = {
				dropover: {
					position: 'bottom-center',
					triggerEvent: 'hover',
				},
				maxUsersDisplay: 2,
			}
		}

		function listeners () {
			vm.unregisterFns = [];
			$scope.$on('$destroy', function() {
				vm.unregisterFns.forEach(function (unregisterFn) { unregisterFn(); });
			});
			vm.unregisterFns.push(
				$rootScope.$on('update-filter', function(event) {
					updateSummary();
				})
			)
		}

		///////////////////////

		function setDefaults () {
			updateSummary();
		}

		function updateSummary () {
			var filter = filterService.getFilter();
			vm.users = filter.users;
			vm.timespans = filter.timespans;
		}
	}
})();

(function () {
	'use strict';

	angular
		.module('prisma.directives')
		.directive('ldFilterSettings', ldFilterSettings);

	ldFilterSettings.$inject = [];

	function ldFilterSettings () {
		// Usage:
		//
		// Creates:
		//
		var directive = {
			bindToController: true,
			controller: Controller,
			controllerAs: 'vm',
			link: link,
			restrict: 'A',
			templateUrl: 'views/directives/filter-settings/filter-settings.html',
			scope: {
			}
		};
		return directive;

		function link (scope, element, attrs) {
		}
	}

	Controller.$inject = ['$log', '$scope', '$rootScope', '$q', '_', '$mdDialog', 'toastFactory', 'accountsService', 'filterService', 'userService', 'generalService'];

	function Controller ($log, $scope, $rootScope, $q, _, $mdDialog, toastFactory, accountsService, filterService, userService, generalService) {
		var vm = this;

		vm.$onInit = function() {
			methods();
			variables();
			listeners();

			initSettings();
		}

		function methods () {
			vm.setFilter = setFilter;
			vm.resetFilter = resetFilter;
			vm.toDateString = toDateString;
		}

		function variables () {
			vm.filterIsSet = false;
			vm.settings = {
				date: undefined,
				timespan: {
					from: 0,
					to: 24 * 60 * 60 * 1000 - (60 * 1000),
				}
			};
			vm.filter = {
				accounts: [],
				date: vm.settings.date,
				timespan: {
					from: vm.settings.timespan.from,
					to: vm.settings.timespan.to,
				},
			};

			generalService.config('privacy').catch(function () {
			  return {};
			}).then(function (privacyConfig) {
				vm.privacyConfig = privacyConfig;
			});

			generalService.config('user').catch(function () {
				return {};
			}).then(function (userConfig) {
				vm.userConfig = userConfig || {};
			});

			vm.maxNumberOfUsers = 150;
		}

		function listeners () {
			vm.unregisterFns = [];
			$scope.$on('$destroy', function() {
				vm.unregisterFns.forEach(function (unregisterFn) { unregisterFn(); });
			});
			vm.unregisterFns.push(
				$rootScope.$on('reset-filter', function(event) {
					vm.filter.date = undefined;
					vm.filter.timespan.from = vm.settings.timespan.from;
					vm.filter.timespan.to = vm.settings.timespan.to;
				}),
				$rootScope.$on('set-filter-from-user-config', function(event) {
					if (!vm.userConfig || !vm.userConfig.filter) {
						toastFactory.show('Kein persönlicher Filter gespeichert');
						return;
					}
					accountsService.resetSelectedAccounts();
					filterService.setRawFilter(vm.userConfig.filter);

					vm.filter.accounts = vm.userConfig.filter.accounts || vm.filter.accounts;
					vm.filter.date = vm.userConfig.filter.date || vm.filter.date;
					vm.filter.timespan.from = (vm.userConfig.filter.timespan && vm.userConfig.filter.timespan.from !== undefined ) ? vm.userConfig.filter.timespan.from : vm.filter.timespan.from;
					vm.filter.timespan.to = (vm.userConfig.filter.timespan && vm.userConfig.filter.timespan.to ) || vm.filter.timespan.to;

					accountsService.loadSelectedAccounts().then(function () {
						setFilter();
						$rootScope.$broadcast('filter-updated-automatically');
					});

				}),
				$rootScope.$on('store-filter-to-user-config', function(event) {
					var rawFilter = filterService.getRawFilter();
					vm.userConfig.filter = rawFilter;
					userService.storeConfig(vm.userConfig).then(function (userConfig) {
						toastFactory.show('Persönlicher Filter wurde gespeichert');
						vm.userConfig = userConfig;
					});
				})
			);
		}

		///////////////////////

		function initSettings () {
			vm.filterIsSet = filterService.isFilterSet();
			var rawFilter = filterService.getRawFilter();
			if (rawFilter !== undefined)
				vm.filter = rawFilter;
		}

		function setFilter () {
			var filter = {
				users: [],
				timespans: [],
			}
			prepareUsersFilter(accountsService.selectedAccounts)
				.then(validateUsersFilter)
				.then(function (users) {
					filter.users = users;
					return prepareTimespansFilter(vm.filter.date, vm.filter.timespan);
				})
				.then(function (timespans) {
					filter.timespans = timespans;
					return filter;
				})
				.then(function (filter) {
					filterService.setFilter(filter);
					vm.filter.accounts = accountsService.getSelectedAccountsAsPath();
					filterService.setRawFilter(vm.filter);
					vm.filterIsSet = true;
				})
				.catch(function (errorMsg) {
					toastFactory.show(errorMsg);
				});
		}

		function resetFilter () {
			filterService.resetFilter();
			vm.filterIsSet = false;
		}

		function toDateString (milliseconds) {
			var hour = getHour(milliseconds);
			var minute = getMinute(milliseconds);
			return ('00' + hour).slice(-2) + ':' + ('00' + minute).slice(-2);
		}

		function getHour (milliseconds) {
			return Math.floor(milliseconds / (60*60*1000));
		}

		function getMinute (milliseconds) {
			return Math.floor((milliseconds % (60*60*1000)) / (60*1000));
		}

		function prepareUsersFilter (accounts) {

			var consolidatedUsers = [];

			// get highest selected parents
			for (var i = accounts.length - 1; i >= 0; i--) {
				var highestSelectedParent = getHighestSelectedParent(accounts[i]);
				if (consolidatedUsers.indexOf(highestSelectedParent) === -1)
					consolidatedUsers.push(highestSelectedParent);
			}

			// get ids of leaves for parents
			var formattedUsers = [];

			var formattedUsersPromises = [];

			for (var i = consolidatedUsers.length - 1; i >= 0; i--) {
				formattedUsersPromises.push(
					getFormattedUser(consolidatedUsers[i]).then(function (user) {
						formattedUsers.push(user);
					})
				);
			}

			return $q.all(formattedUsersPromises).then(function () {
				return formattedUsers;
			});
		}

		function validateUsersFilter (users) {
			var usersCount = _.reduce(users, function (carry, user) {
				return carry + user.cadsIds.length;
			}, 0);
			if (usersCount > 0 && usersCount < vm.privacyConfig.minimum_users_filter)
				return showPrivacyAlert().then(function () {
					return users;
				}).catch(function () {
					return [];
				});
			if (usersCount > vm.maxNumberOfUsers) {
				return $q.reject('Es können maximal ' + vm.maxNumberOfUsers + ' Studierende ausgewählt werden (Aktuell: ' + usersCount + ')');
			}
			return $q.when(users);
		}

		function showPrivacyAlert () {
			var alert = $mdDialog.alert()
				.title('Achtung - Datenschutzverletzung!')
				.htmlContent(
					'Sie haben <strong>weniger als ' + vm.privacyConfig.minimum_users_filter + ' Studierende</strong> ausgewählt.<br>' +
					'Dadurch kann keine Anonymität mehr gewährleistet werden.<br><br>' +
					'<b>Der Filter wird nicht übernommen.</b>'
				)
				.ariaLabel('Datenschutzverletzung')
				.ok('Okay')
			return $mdDialog.show(alert).then(function () {
				return $q.reject();
			});
		}

		function showPrivacyDialog () {
			var confirm = $mdDialog.confirm()
				.title('Achtung - Datenschutzverletzung!')
				.htmlContent(
					'Sie haben <strong>weniger als ' + vm.privacyConfig.minimum_users_filter + ' Studierende</strong> ausgewählt.<br>' +
					'Dadurch kann keine Anonymität mehr gewährleistet werden.<br>' +
					'Bitte holen Sie sich die <b>Einverständniserklärung der betroffenen Personen</b> ein, bevor Sie fortfahren.<br><br>' +
					'<i>Hinweis: Dieser Zugriff wird protokolliert.</i>'
				)
				.ariaLabel('Datenschutzverletzung')
				.ok('Datensätze trotzdem anzeigen')
				.cancel('Filter verwerfen')
			return $mdDialog.show(confirm);
		}

		function getHighestSelectedParent (item) {
			if (item.parent && accountsService.isSelected(item.parent))
				return getHighestSelectedParent(item.parent);
			return item;
		}

		function getFormattedUser (account) {
			var path, semesterName;
			if (account.parent) {
				path = accountsService.getNamePathToAccount(account.parent);
				if (path.length > 1) {
					semesterName = path[1];
				}
				path = path.reverse().join(' < ');
			}
			if (account.isLeave) {
				return $q.when({
					name: account.name,
					semesterName: semesterName,
					path: path,
					cadsIds: [account.id]
				});
			}
			return accountsService.getLeaves(account).then(function (leaves) {
				return {
					name: account.name,
					semesterName: semesterName,
					path: path,
					cadsIds: _.pluck(leaves, 'id'),
				}
			})
		}

		function prepareTimespansFilter(date, timespan) {
			date = new Date(date);
			if (isNaN(date))
				return $q.when([]);
			if (timespan.from >= timespan.to)
				return $q.reject('Zeit-Filer: "von" größer als "bis"');
			return $q.when([
				[
					new Date(date.getFullYear(), date.getMonth(), date.getDate(), getHour(timespan.from), getMinute(timespan.from)),
					new Date(date.getFullYear(), date.getMonth(), date.getDate(), getHour(timespan.to), getMinute(timespan.to)),
				]
			]);
		}
	}
})();

(function () {
	'use strict';

	angular
		.module('prisma.directives')
		.directive('ldQuestionRanking', ldQuestionRanking);

	ldQuestionRanking.$inject = [];

	function ldQuestionRanking () {
		// Usage:
		//
		// Creates:
		//
		var directive = {
			bindToController: true,
			controller: Controller,
			controllerAs: 'vm',
			link: link,
			restrict: 'A',
			templateUrl: 'views/directives/aggregation-types/question-ranking/question-ranking.html',
			scope: {
				data: '='
			}
		};
		return directive;

		function link (scope, element, attrs) {
		}
	}

	Controller.$inject = ['_'];

	function Controller (_) {
		var vm = this;



		vm.$onInit = function() {
			vm.table = prepareTable(vm.data.attributes, {transpose: false});
			vm.toggleTableColumn = toggleTableColumn;
			vm.transposeTable = transposeTable;
		}

		function prepareTable (attributes, config) {
			if (!attributes.length) {
				return;
			}
			var ranks = attributes.map(function(attribute, index) {
				return {
					title: index + 1 + '.',
				}
			});
			var attributeNames = attributes.map(function (attribute) {
				return {
					title: attribute.value,
				};
			});

			var table = {
				config: config,
				data: attributes.map(function(attribute) {
					return attribute.ranks.map(function(frequency, index) {
						return {
							frequency: frequency,
							isCorrect: attribute.correctRank === index + 1,
						}
					});
				}),
				cols: ranks,
				rows: attributeNames,
			}

			if (config.transpose) {
				table = pTransposeTable(table);
			}

			return table;
		}

		function pTransposeTable(table) {
			return {
				cols: table.rows,
				rows: table.cols,
				data: _.unzip(table.data),
			}
		}

		function transposeTable() {
			var table = pTransposeTable(vm.table);
			vm.table = table;
		}

		function toggleTableColumn(columnIndex, hoverState) {
			if (hoverState === undefined) {
				hoverState = true;
			}

			vm.table.data.forEach(function (row) {
				row.forEach(function (column, index) {
					if (index === columnIndex) {
						column.hover = hoverState;
					}
				});
			});
			vm.table.cols[columnIndex].hover = hoverState;
		}
	}
})();

(function () {
	'use strict';

	angular
		.module('prisma.directives')
		.directive('ldQuestionOpen', ldQuestionOpen);

	ldQuestionOpen.$inject = [];

	function ldQuestionOpen () {
		// Usage:
		//
		// Creates:
		//
		var directive = {
			bindToController: true,
			controller: Controller,
			controllerAs: 'vm',
			restrict: 'A',
			templateUrl: 'views/directives/aggregation-types/question-open/question-open.html',
			scope: {
				data: '=',
				compare: '='
			}
		};
		return directive;
	}

	Controller.$inject = ['$rootScope', '$scope', '_'];

	function Controller ($rootScope, $scope, _) {
		var vm = this;
		vm.$onInit = function() {
			vm.onClick = onClick;
			vm.selectedElements = [];
			vm.elements = _.map(vm.data.values, function (value) {
				if (value.answer) {
					return value.answer;
				}
				return value;
			});
		}

		$scope.$on('hide-marks', function (event, config) {
			if (config.skipUpdate) {
				return;
			}
			if (config.questionId === vm.data.linked_marker_question_id) {
				for (var i = 0; i < vm.selectedElements.length; i++) {
					if (vm.selectedElements[i]) {
						vm.selectedElements[i] = false;
					};
				}
			}
		});

		$scope.$on('selected-mark-for-user', function (event, config) {
			if (config.skipUpdate || config.questionId !== vm.data.linked_marker_question_id) {
				return;
			}
			changeSelectionForUser(true, config.userId);
		});

		$scope.$on('deselected-mark-for-user', function (event, config) {
			if (config.skipUpdate || config.questionId !== vm.data.linked_marker_question_id) {
				return;
			}
			changeSelectionForUser(false, config.userId);
		});

		function changeSelectionForUser (select, userId) {
			var index = _.findIndex(vm.data.values, function (value) {
				return value.user_id === userId
			});
			if (index === -1) {
				return;
			}
			vm.selectedElements[index] = select;
		}

		function onClick (event, index, shouldZoom, forceSelect) {
			if (vm.selectedElements[index]) {
				if (!forceSelect) {
					vm.selectedElements[index] = false;
				}
			} else {
				// Only deselect others if this is a linked_marker_question
				if (vm.data.linked_marker_question_id) {
					for (var i = 0; i < vm.selectedElements.length; i++) {
						if (vm.selectedElements[i]) {
							vm.selectedElements[i] = false;
						}
					}
				}
				vm.selectedElements[index] = true;
			}

			if (vm.data.linked_marker_question_id && vm.data.values[index].user_id) {
				var markerMessage = vm.selectedElements[index] ? 'select-mark-for-user' : 'deselect-mark-for-user';
				$rootScope.$broadcast(markerMessage, {
					questionId: vm.data.linked_marker_question_id,
					userId: vm.data.values[index].user_id,
					zoom: !!shouldZoom,
				});
			}
			event.stopPropagation();
		}
	}
})();

(function () {
	'use strict';

	angular
		.module('prisma.directives')
		.directive('ldQuestionMarker', ldQuestionMarker);

	ldQuestionMarker.$inject = [];

	function ldQuestionMarker () {
		// Usage:
		//
		// Creates:
		//
		var directive = {
			bindToController: true,
			controller: Controller,
			controllerAs: 'vm',
			restrict: 'A',
			templateUrl: 'views/directives/aggregation-types/question-marker/question-marker.html',
			scope: {
				data: '='
			}
		};
		return directive;
	}

	Controller.$inject = ['$rootScope', '$scope', '_'];

	function Controller ($rootScope, $scope, _) {
		var vm = this;

		vm.$onInit = function() {
			vm.showAnswers = showAnswers;
			vm.showSolution = showSolution;

			$scope.$on('change-image', function (event, config) {
				if (config.imageId !== vm.data.imageId) {
					$rootScope.$broadcast('hide-marks', {
						imageId: vm.data.imageId,
						questionId: vm.data.id,
						skipActivation: true,
					});
					$rootScope.$broadcast('hide-overlay', {
						imageId: vm.data.imageId,
						questionId: vm.data.id,
						skipActivation: true,
					});
				}
			});

			$scope.$on('show-marks', function (event, config) {
				if (config.skipUpdate) {
					return;
				}

				vm.data.showAnswers = config.questionId === vm.data.id;
				if (vm.data.showSolution) {
					vm.data.showSolution = config.questionId === vm.data.id;
				}
			});

			$scope.$on('deselected-mark', function (event, config) {
				handleChangedMarker(config, false);
			});

			$scope.$on('selected-mark', function (event, config) {
				handleChangedMarker(config, true);
			});

			$scope.$on('deselect-mark-for-user', function (event, config) {
				handleMarkerChange(config, false);
			});

			$scope.$on('select-mark-for-user', function (event, config) {
				handleMarkerChange(config, true);
			});

			$scope.$on('hide-marks', function (event, config) {
				if (config.skipUpdate) {
					return;
				}

				if (config.questionId === vm.data.id) {
					vm.data.showAnswers = false;
				}
			});

			$scope.$on('show-overlay', function (event, config) {
				if (config.skipUpdate) {
					return;
				}

				vm.data.showSolution = config.questionId === vm.data.id;
				if (vm.data.showAnswers) {
					vm.data.showAnswers = config.questionId === vm.data.id;
				}
			});

			$scope.$on('hide-overlay', function (event, config) {
				if (config.skipUpdate) {
					return;
				}

				if (config.questionId === vm.data.id) {
					vm.data.showSolution = false;
				}
			});
		}

		vm.$onDestroy = function() {
			vm.data.showAnswers = false;
			vm.data.showSolution = false;
		}

		function handleChangedMarker(config, wasSelected) {
			if (config.skipUpdate) {
				return;
			}

			if (config.questionId !== vm.data.id) {
				return;
			}

			var mark = _.find(vm.data.marks, function (mark) {
				return mark.id === config.mark;
			});

			if (!mark) {
				return;
			}

			var message = wasSelected ? 'selected-mark-for-user' : 'deselected-mark-for-user';
			$rootScope.$broadcast(message, {
				imageId: vm.data.imageId,
				questionId: vm.data.id,
				userId: mark.user_id,
			});
		}

		function handleMarkerChange(config, shouldSelect) {
			if (config.skipUpdate) {
				return;
			}

			if (config.questionId !== vm.data.id) {
				return;
			}

			if (!vm.data.showAnswers) {
				showAnswers();
			}

			var mark = _.filter(vm.data.marks, function (mark) {
				return mark.user_id === config.userId;
			});

			if (!mark.length) {
				return;
			}

			var message = shouldSelect ? (config.zoom ? 'zoom-mark' : 'select-mark') : 'deselect-mark';

			$rootScope.$broadcast(message, {
				imageId: vm.data.imageId,
				questionId: vm.data.id,
				mark: mark[0].id,
			});
		}

		function showAnswers () {
			if (vm.data.showAnswers) {
				$rootScope.$broadcast('hide-marks', {
					imageId: vm.data.imageId,
					questionId: vm.data.id,
				});
			}
			else {
				$rootScope.$broadcast('show-marks', {
					imageId: vm.data.imageId,
					questionId: vm.data.id,
					marks: vm.data.marks,
				});
			}
		}

		function showSolution () {
			if (vm.data.showSolution) {
				$rootScope.$broadcast('hide-overlay', {
					imageId: vm.data.imageId,
					questionId: vm.data.id,
				});
			}
			else {
				$rootScope.$broadcast('show-overlay', {
					imageId: vm.data.imageId,
					questionId: vm.data.id,
					overlayId: vm.data.overlayId,
				});
			}
		}

	}
})();

(function () {
	'use strict';

	angular
		.module('prisma.directives')
		.directive('ldQuestionCollection', ldQuestionCollection);

	ldQuestionCollection.$inject = [];

	function ldQuestionCollection () {
		// Usage:
		//
		// Creates:
		//
		var directive = {
			bindToController: true,
			controller: Controller,
			controllerAs: 'vm',
			restrict: 'A',
			templateUrl: 'views/directives/aggregation-types/question-collection/question-collection.html',
			scope: {
				collection: '='
			}
		};
		return directive;
	}

	Controller.$inject = ['$log', '$rootScope', '$scope'];

	function Controller ($log, $rootScope, $scope) {
		var vm = this;

		vm.$onInit = function() {
			vm.showOverlay = showOverlay;

			$scope.$on('show-overlay', function (event, config) {
				if (config.skipUpdate) {
					return;
				}

				vm.collection.showOverlay = config.questionId === vm.collection.id;
			});

			$scope.$on('hide-overlay', function (event, config) {
				if (config.skipUpdate) {
					return;
				}

				if (config.questionId === vm.collection.id) {
					vm.collection.showOverlay = false;
				}
			});

			$scope.$on('show-marks', function (event, config) {
				if (config.skipUpdate) {
					return;
				}

				vm.collection.showOverlay = config.questionId === vm.collection.id;
			});

			$scope.$on('hide-marks', function (event, config) {
				if (config.skipUpdate) {
					return;
				}

				if (config.questionId === vm.collection.id) {
					vm.collection.showOverlay = false;
				}
			});
		}

		function showOverlay () {
			if (!vm.collection.overlays || !angular.isArray(vm.collection.overlays))
				return;

			if (!vm.collection.showOverlay) { // set variables only, if overlay is not already shown
				for (var i = 0; i < vm.collection.overlays.length; i++) {
					$rootScope.$broadcast('show-overlay', {
						imageId: vm.collection.overlays[i].imageId,
						questionId: vm.collection.id,
						overlayId: vm.collection.overlays[i].overlayId,
					});
				}
			} else {
				for (var i = 0; i < vm.collection.overlays.length; i++) {
					$rootScope.$broadcast('hide-overlay', {
						imageId: vm.collection.overlays[i].imageId,
						questionId: vm.collection.id,
					});
				}
			}

		}
	}
})();

(function () {
	'use strict';

	angular
		.module('prisma.directives')
		.directive('ldQuestionBasic', ldQuestionBasic);

	ldQuestionBasic.$inject = [];

	function ldQuestionBasic () {
		// Usage:
		//
		// Creates:
		//
		var directive = {
			bindToController: true,
			controller: Controller,
			controllerAs: 'vm',
			restrict: 'A',
			templateUrl: 'views/directives/aggregation-types/question-basic/question-basic.html',
			scope: {
				data: '='
			}
		};
		return directive;
	}

	Controller.$inject = [];

	function Controller () {
		var vm = this;

		vm.$onInit = function() {
			vm.order = {
				attribute: 'frequency',
				reverse: true,
			}

			vm.orderBy = function (attribute) {
				if (attribute === vm.order.attribute)
					vm.order.reverse = !vm.order.reverse;
				else {
					vm.order.attribute = attribute;
					vm.order.reverse = true;
				}
			}
		}
	}
})();

(function () {
	'use strict';

	angular
		.module('prisma.directives')
		.directive('ldGroupedFrequencyDistribution', ldGroupedFrequencyDistribution);

	ldGroupedFrequencyDistribution.$inject = [];

	function ldGroupedFrequencyDistribution () {
		// Usage:
		//
		// Creates:
		//
		var directive = {
			bindToController: true,
			controller: Controller,
			controllerAs: 'vm',
			restrict: 'A',
			templateUrl: 'views/directives/aggregation-types/grouped-frequency-distribution/grouped-frequency-distribution.html',
			scope: {
				data: '='
			}
		};
		return directive;
	}

	Controller.$inject = [];

	function Controller () {
		var vm = this;

		vm.$onInit = function() {
			vm.order = {
				attribute: 'frequency',
				reverse: true,
			}

			vm.orderBy = function (attribute) {
				if (attribute === vm.order.attribute)
					vm.order.reverse = !vm.order.reverse;
				else {
					vm.order.attribute = attribute;
					vm.order.reverse = true;
				}
			}
		}

	}
})();

(function () {
	'use strict';

	angular
		.module('prisma.directives')
		.directive('ldFrequencyDistribution', ldFrequencyDistribution);

	ldFrequencyDistribution.$inject = [];

	function ldFrequencyDistribution () {
		// Usage:
		//
		// Creates:
		//
		var directive = {
			bindToController: true,
			controller: Controller,
			controllerAs: 'vm',
			restrict: 'A',
			templateUrl: 'views/directives/aggregation-types/frequency-distribution/frequency-distribution.html',
			scope: {
				data: '=',
				orderAttribute: '=?',
				orderReverse: '=?',
			}
		};
		return directive;
	}

	Controller.$inject = [];

	function Controller () {
		var vm = this;

		vm.$onInit = function() {
			vm.order = {
				attribute: vm.orderAttribute || 'frequency',
				reverse: (vm.orderReverse !== undefined ? vm.orderReverse : true),
			}

			vm.orderBy = function (attribute) {
				if (attribute === vm.order.attribute)
					vm.order.reverse = !vm.order.reverse;
				else {
					vm.order.attribute = attribute;
					vm.order.reverse = true;
				}
			}
		}
	}
})();

(function () {
	'use strict';

	angular
		.module('prisma.directives')
		.directive('ldFrequency', ldFrequency);

	ldFrequency.$inject = [];

	function ldFrequency () {
		// Usage:
		//
		// Creates:
		//
		var directive = {
			restrict: 'A',
			templateUrl: 'views/directives/aggregation-types/frequency/frequency.html',
			scope: {
				data: '='
			}
		};
		return directive;
	}
})();
(function () {
	'use strict';

	angular
		.module('prisma.directives')
		.directive('ldFreeText', ldFreeText);

	ldFreeText.$inject = [];

	function ldFreeText () {
		// Usage:
		//
		// Creates:
		//
		var directive = {
			restrict: 'A',
			templateUrl: 'views/directives/aggregation-types/free-text/free-text.html',
			scope: {
				data: '='
			}
		};
		return directive;
	}
})();
(function () {
	'use strict';

	angular
		.module('prisma.directives')
		.directive('ldAccountsTree', ldAccountsTree);

	ldAccountsTree.$inject = [];

	function ldAccountsTree () {
		// Usage:
		//
		// Creates:
		//
		var directive = {
			bindToController: true,
			controller: Controller,
			controllerAs: 'vm',
			link: link,
			restrict: 'A',
			templateUrl: 'views/directives/accounts-tree/accounts-tree.html',
			scope: { },
		};
		return directive;

		function link (scope, element, attrs) {
		}
	}

	Controller.$inject = ['$log', '$scope', '$rootScope', '_', '$q', 'accountsService'];

	function Controller ($log, $scope, $rootScope, _, $q, accountsService) {

		var vm = this;

		vm.$onInit = function() {
			methods();
			variables();
			listeners();
		}

		function methods () {
			vm.toggleSelection = toggleSelection;
			vm.toggleExpansion = toggleExpansion;
			vm.isSelected = accountsService.isSelected;
			vm.isDeselected = accountsService.isDeselected;
			vm.isInderterminate = accountsService.isInderterminate;
		}

		function variables () {
			accountsService.getAccounts().then(function (accounts) {
				vm.accounts = accounts;
				return accountsService.loadSelectedAccounts();
			}).then(expandLoadedChildren);
		}

		function listeners () {
			vm.unregisterFns = [];
			$scope.$on('$destroy', function() {
				vm.unregisterFns.forEach(function (unregisterFn) { unregisterFn(); });
			});
			vm.unregisterFns.push(
				$rootScope.$on('reset-filter', function(event) {
					accountsService.resetSelectedAccounts();
				}),
				$rootScope.$on('filter-updated-automatically', function(event) {
					expandLoadedChildren();
				})
			);
		}

		///////////////////////

		function toggleSelection (account) {
			if (account === undefined)
				return;
			if (vm.isSelected(account) || vm.isInderterminate(account)) {
				deselect(account);
			} else {
				select(account);
			}
		}

		function toggleExpansion(account) {
			if (account === undefined)
				return;
			if (!account.expanded)
				expand(account);
			else
				collapse(account);
		}

		function expand(account) {
			accountsService.expand(account)
				.then(function () {
					account.expanded = true;
				});
		}

		function collapse(account) {
			accountsService.collapse(account)
				.then(function() {
					account.expanded = false;
				});
		}

		function deselect(account) {
			if (vm.isDeselected(account)) {
				return;
			}
			accountsService.deselect(account);
		}

		function select(account) {
			if (vm.isSelected(account)) {
				return;
			}
			accountsService.select(account);
		}

		function expandLoadedChildren() {
			_.each(vm.accounts, expandLoadedChildrenHelper);
		}

		function expandLoadedChildrenHelper(currentAccount) {
			if (!currentAccount.isLeave &&
				currentAccount.children &&
				currentAccount.children.length &&
				accountsService.isInderterminate(currentAccount)
			) {
				currentAccount.expanded = true;
				_.each(currentAccount.children, expandLoadedChildrenHelper);
			}
		}
	}
})();

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
(function() {
	'use strict';

	angular
		.module('prisma.config')
		.config(configure);

	configure.$inject = ['$mdThemingProvider'];
	function configure ($mdThemingProvider) {

		$mdThemingProvider.theme('default')
			.primaryPalette('lime')
			.accentPalette('orange')
			.warnPalette('red');
	}
})();
(function() {
	'use strict';

	angular
		.module('prisma.config')
		.config(configure);

	configure.$inject = ['$sceDelegateProvider'];
	function configure ($sceDelegateProvider) {
		$sceDelegateProvider.resourceUrlWhitelist([
      'self',
      'https://clovid.uni-muenster.de/**',
      'https://omero.clovid.org/**',
      'https://api.vquest.eu/**',
      'http://52.137.51.91/**',
      'http://localhost:8080/**',
    ]);
	}
})();
(function() {
	'use strict';

	angular
		.module('prisma.config')
		.config(configure);

	configure.$inject = ['$logProvider'];
	function configure ($logProvider) {
		$logProvider.debugEnabled(true);
	}
})();
(function() {
	'use strict';

	angular
		.module('prisma.config')
		.config(configure);

	configure.$inject = ['$localStorageProvider'];
	function configure ($localStorageProvider) {

		$localStorageProvider.setKeyPrefix('prisma');
	}
})();
(function() {
	'use strict';

	angular
		.module('prisma.config')
		.config(configure);

	configure.$inject = ['$httpProvider'];
	function configure ($httpProvider) {

		$httpProvider.interceptors.push(
			'loadingInterceptor',
			'httpErrorInterceptor'
		);
		// $locationProvider.html5Mode(true);
	}
})();
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

(function() {
	'use strict';

	angular
		.module('prisma.config')
		.config(configure);

	configure.$inject = ['$authProvider'];

	function configure ($authProvider) {

		$authProvider.baseUrl = document.getElementsByTagName('base')[0].href;
		$authProvider.loginUrl = 'login';
		$authProvider.tokenName = 'user_ticket';
	}
})();
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

(function () {
	'use strict';

	angular
		.module('prisma.controllers')
		.controller('DefaultWithImageTabController', DefaultWithImageTabController);

	DefaultWithImageTabController.$inject = ['$log', '$rootScope', '$state', 'task'];

	function DefaultWithImageTabController ($log, $rootScope, $state, task) {
		var vm = this;

		vm.$onInit = function() {
			methods();
			variables();
			listeners();
		}

		function methods () {
			vm.activateImage = activateImage
		}

		function variables () {
			vm.data = task.data[$state.current.url];
			// activate first image if there are any images
			if (vm.data.images[0] !== undefined) {
				vm.data.images[0].active = true;
			}
		}

		function listeners () { }

		////////////////

		function activateImage (imageId) {
			$rootScope.$broadcast('change-image', {imageId: imageId});
		}
	}
})();

(function () {
	'use strict';

	angular
		.module('prisma.controllers')
		.controller('DefaultTabController', DefaultTabController);

	DefaultTabController.$inject = ['$log', '$rootScope', '$state', 'task'];

	function DefaultTabController ($log, $rootScope, $state, task) {
		var vm = this;

		vm.$onInit = function() {
			methods();
			variables();
			listeners();
		}

		function methods () { }

		function variables () {
			vm.data = task.data[$state.current.url];
		}

		function listeners () { }
	}
})();

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

(function () {
	'use strict';

	angular
		.module('prisma.controllers')
		.controller('LoginController', LoginController);

	LoginController.$inject = ['$log', '$q', '$state', '$stateParams', '$localStorage', 'userService', 'toastFactory', '$mdDialog', 'filterService'];

	function LoginController ($log, $q, $state, $stateParams, $localStorage, userService, toastFactory, $mdDialog, filterService) {
		var vm = this;

		vm.$onInit = function() {
			if (userService.isAuthenticated()) {
				redirect();
			}

			methods();
			variables();
			listeners();
		}

		function methods () {
			vm.submit = submit;
		}

		function variables () { }

		function listeners () {	}

		////////////////

		function redirect () {
			var state = $stateParams.redirect_state;
			if (state === undefined || state === 'login')
				state = 'home';
			$state.go(state);
		}

		function submit (event) {
			vm.error = false;
			vm.loading = true;

			userService.login({login: vm.login, password: vm.password}, {noHttpError: true})
				.catch(function (error) {
					if (angular.isObject(error)) {
						if (error.status === 401)
							vm.error = 'Die Kombination von Kennung und Passwort ist nicht gültig.';
						else if (error.status === 403) {
							vm.error = 'Sie besitzen nicht die notwendigen Berechtigungen, um PRISMA zu verwenden.';
							userService.logout({noHttpError: true});
							showPermissionAlert(event);
						}
						else {
							$log.error('Unknown error while logging in', error);
							vm.error = 'Ein unbekannter Fehler ist aufgetreten. Wenden Sie sich bitte an den Administrator.';
						}
					}
					else
						vm.error = 'Ein unbekannter Fehler ist aufgetreten. Wenden Sie sich bitte an den Administrator.';
					return $q.reject(error);
				})
				.then(function () {
					$localStorage.$reset();
					filterService.resetFilter();
				})
				.then(redirect)
				.finally(function () {
					vm.loading = false;
				});
		}

		function showPermissionAlert (event) {
			$mdDialog.show(
				$mdDialog.alert()
					.clickOutsideToClose(true)
					.title('Fehlende Berechtigungen')
					.htmlContent('Sie verfügen <strong>nicht</strong> über die notwendigen Berechtigungen, um PRISMA zu verwenden.<br/><br/>Wenden Sie sich bitte an den Administrator (pawelka@uni-muenster.de),<br/>wenn Sie entsprechende Berechtigungen erhalten wollen.')
					.ariaLabel('Fehlende Berechtigungen')
					.ok('Okay')
					.targetEvent(event)
			);
		}
	}
})();

(function () {
	'use strict';

	angular
		.module('prisma.controllers')
		.controller('HomeController', HomeController);

	HomeController.$inject = ['$log', '$rootScope', '$scope', 'modulesService', 'generalService'];

	function HomeController ($log, $rootScope, $scope, modulesService, generalService) {
		var vm = this;

		vm.$onInit = function() {
			methods();
			variables();
			listeners();

			refreshModuleList();
		}

		function methods () {
			vm.storeFilterToUserConfig = storeFilterToUserConfig;
			vm.setFilterFromUserConfig = setFilterFromUserConfig;
		}

		function variables () {
			generalService.config('user').catch(function () {
				return {};
			}).then(function (userConfig) {
				vm.userConfig = userConfig || {};
			});
		}

		function listeners () {
			vm.unregisterFns = [];
			$scope.$on('$destroy', function() {
				vm.unregisterFns.forEach(function (unregisterFn) { unregisterFn(); });
			});

			vm.unregisterFns.push(
				$rootScope.$on('update-filter', function (event) {
					refreshModuleList();
				})
			);
		}

		////////////////

		function refreshModuleList () {
			modulesService.getModules()
				.then(function (modules) {
					vm.modules = modules;
				})
				.then(modulesService.getFilteredList);
		}

		function storeFilterToUserConfig() {
			$rootScope.$broadcast('store-filter-to-user-config')
		}

		function setFilterFromUserConfig() {
			$rootScope.$broadcast('set-filter-from-user-config')
		}

	}
})();

(function () {
	'use strict';

	angular
		.module('prisma.controllers')
		.controller('UserDialogController', UserDialogController);

	UserDialogController.$inject = ['$log', '$mdDialog', 'usersService', 'modules'];

	function UserDialogController ($log, $mdDialog, usersService, modules) {
		var vm = this;

		vm.modules = modules;
		vm.user = {};
		vm.selectedModules = [];

		vm.cancel = function () {
			$mdDialog.cancel();
		}

		vm.submit = function () {
			var user;
			return usersService.store(vm.user).then(function (createdUser) {
				user = createdUser;
				if (vm.selectedModules.length)
					return usersService.updateModules(user, vm.selectedModules);
			}).then(function () {
				return $mdDialog.hide(user);
			});
		}

		vm.refreshPassword = function () {
			vm.user.password = Math.random().toString(36).slice(2, 8);
		}

		vm.refreshPassword();
	}
})();

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

(function () {
	'use strict';

	angular
		.module('prisma.controllers')
		.controller('AdminUsersController', AdminUsersController);

	AdminUsersController.$inject = ['$log', '_', '$localStorage', 'toastFactory', '$mdDialog', 'usersService'];

	function AdminUsersController ($log, _, $localStorage, toastFactory, $mdDialog, usersService) {
		var vm = this;


		vm.$onInit = function() {
			methods();
			variables();
			applyFilter();
		}

		// All public methods of this controller
		function methods () {
			vm.applyFilter = applyFilter;
			vm.queryModules = usersService.modules;

			// Action methods
			vm.editModules = editModules;
			vm.editModulesMultiple = editModulesMultiple;

			vm.toggle = toggle;

			vm.create = createUser;
			vm.destroy = destroyUser;
		}

		// All public variables of this controller
		function variables () {
			vm.selected = [];
			vm.queriedUsers = [];
			vm.settings = {
				order: 'login',
			};
			vm.pagination = {
				limit: 10,
				page: 1,
			};
			vm.counts = usersService.counts;
			vm.filter = pInitFilter();
		}

		//////////////////////
		/// Public methods ///
		//////////////////////

		/**
		 * Persists the filters and starts a query.
		 * @return {promise}
		 */
		function applyFilter () {
			pPersistFilter(vm.filter);
			return pQuery(vm.filter);
		}

		/**
		 * Opens a dialog to select the modules of a user.
		 * The current modules of the user are preselected.
		 * Syncs the selected ones with the server via the users service.
		 * Toasts a success message.
		 * @param  {DOMClickEvent} event of the click
		 * @param  {Object} user
		 * @return {promise}
		 */
		function editModules (event, user) {
			return $mdDialog.show(pModulesDialog(event, user.modules)).then(function (modules) {
				return usersService.updateModules(user, modules);
			}).then(function () {
				toastFactory.show('Modulezugriff wurde aktualisiert');
			}).catch(function (error) {
				if (error !== undefined) {
					$log.error('Unknown error when editing module of user', error);
				}
			});
		}

		/**
		 * Opens a dialog to select the modules of multiple users.
		 * NO modules are preselected.
		 * Syncs the selected ones with the server via the users service.
		 * Toasts a success message or a list of users where the modules
		 * could not be updated.
		 * @param  {DOMClickEvent} event of the click
		 * @param  {List} users
		 * @return {promise}
		 */
		function editModulesMultiple (event, users) {
			return $mdDialog.show(pModulesDialog(event)).then(function (modules) {
				return usersService.updateModulesMultiple(users, modules);
			}).then(function (failedUsers) {
				if (failedUsers.length > 0) {
					var logins = _.pluck(failedUsers, 'login');
					if (logins.length === 1)
						return toastFactory.show('Für den Benutzer ' + logins[0] + ' konnte der Modulezugriff nicht aktualisiert werden.');
					if (logins.length === 2)
						return toastFactory.show('Für die Benutzer ' + logins.join('" und "') + ' konnte der Modulezugriff nicht aktualisiert werden.');
					return toastFactory.show('Für den Benutzer "' + logins[0] + '" und ' + _.rest(logins).length + ' weitere konnte der Modulezugriff nicht aktualisiert werden.');
				}
				return toastFactory.show('Modulezugriff wurde aktualisiert.');
			}).catch(function (error) {
				if (error !== undefined) {
					$log.error('Unknown error when editing module of users', error);
				}
			});
		}

		function toggle (event, user, property) {
			user[property] = !user[property];
			return usersService.update(user)
				.catch(function (error) {
					if (error !== undefined) {
						$log.error('Unknown error when updating users', error);
					}
				})
				.then(function (user) {
					return toastFactory.show('Benutzer wurde aktualisiert.');
				}).catch(function () {});
		}

		/**
		 * Opens a dialog to create a new user.
		 * If succeed it returns the created user, shows a message and reload the users list.
		 * @param  {DOMClickEvent} event of the click
		 * @return {promise}
		 */
		function createUser (event) {
			return $mdDialog.show(pUserDialog(event)).then(function (user) {
				toastFactory.show('Benutzer ' + user.login + ' wurde erstellt.');
				return pQuery(vm.filter, true);
			}).catch(function (error) {
				if (error !== undefined) {
					$log.error('Unknown error when creating a new user', error);
				}
			});
		}

		/**
		 * Destroys the user from the server after getting confirmation.
		 * @param  {DOMClickEvent} event of the click
		 * @param  {Object} user
		 * @return {promise}
		 */
		function destroyUser (event, user) {
			var confirm = $mdDialog.confirm()
				.title('Benutzer löschen')
				.textContent('Möchten Sie den gewählten lokalen Benutzer wirklich löschen?')
				.ariaLabel('Benutzer löschen')
				.targetEvent(event)
				.ok('Benutzer löschen')
				.cancel('Abbrechen');

			return $mdDialog.show(confirm).then(function () {
				return usersService.destroy(user);
			})
			.then(function () {
				toastFactory.show('Benutzer ' + user.login + ' wurde gelöscht.');
				return pQuery(vm.filter, true);
			}).catch(function (error) {
				if (error !== undefined) {
					$log.error('Unknown error when destroying user', error);
				}
			});
		}

		///////////////////////
		/// Private methods ///
		///////////////////////

		/**
		 * Filters the users on the server and updates the page (if necessary).
		 * @param  {Object} filter { name: String, modules: [] }
		 * @param {bool|null} force a server query, defaults to false
		 * @return {promise}
		 */
		function pQuery (filter, force) {
			return usersService.index(filter, force).then(function (users) {
				vm.queriedUsers = users;
				if (vm.queriedUsers.length <= (vm.pagination.page - 1) * vm.pagination.limit)
					vm.pagination.page = Math.ceil(vm.queriedUsers.length / vm.pagination.limit) || 1;
				return vm.queriedUsers;
			}).catch(function (error) {
				$log.error('Querying users failed!', error);
			});
		}

		/**
		 * Initialized the filters from the local storage
		 * @return  {Object} filter { name: String, modules: [] }
		 */
		function pInitFilter () {
			return {
				name: $localStorage.filterUsersName || '',
				modules: $localStorage.filterUsersModules || [],
			}
		}

		/**
		 * Persists the filters in the local storage
		 * @param  {Object} filter { name: String, modules: [] }
		 * @return {undefined}
		 */
		function pPersistFilter (filter) {
			$localStorage.filterUsersName = filter.name;
			$localStorage.filterUsersModules = filter.modules;
		}

		/**
		 * Creates a custom dialog for the selection of modules.
		 * Preselects the selected modules.
		 * @param  {DOMClickEvent} event of the click
		 * @param  {List} selectedModules
		 * @return {Object} config for $mdDialog.show
		 */
		function pModulesDialog (event, selectedModules) {
			if (!selectedModules)
				selectedModules = [];
			return {
				controller: 'ModulesDialogController',
				controllerAs: 'vm',
				locals: {
					modules: usersService.modules(),
					selectedModules: selectedModules,
				},
				bindToController: true,
				templateUrl: 'views/app/admin-users/modules-dialog.html',
				parent: angular.element(document.body),
				targetEvent: event,
				clickOutsideToClose: true
			}
		}

		/**
		 * Creates a custom dialog for the creation of a new user.
		 * Provides the available modules.
		 * @param  {DOMClickEvent} event of the click
		 * @return {Object} config for $mdDialog.show
		 */
		function pUserDialog (event) {
			return {
				controller: 'UserDialogController',
				controllerAs: 'vm',
				locals: {
					modules: usersService.modules(),
				},
				bindToController: true,
				templateUrl: 'views/app/admin-users/user-dialog.html',
				parent: angular.element(document.body),
				targetEvent: event,
				clickOutsideToClose: true
			}
		}
	}
})();
