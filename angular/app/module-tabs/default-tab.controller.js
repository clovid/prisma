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
