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
