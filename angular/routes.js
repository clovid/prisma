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
