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
