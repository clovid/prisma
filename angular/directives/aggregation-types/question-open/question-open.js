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
