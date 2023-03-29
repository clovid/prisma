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
