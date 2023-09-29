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
					color: vm.data.color,
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
