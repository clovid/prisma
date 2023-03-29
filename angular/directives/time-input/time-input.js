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
