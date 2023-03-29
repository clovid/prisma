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
