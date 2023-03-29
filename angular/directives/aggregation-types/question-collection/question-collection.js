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
