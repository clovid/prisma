(function () {
	'use strict';

	angular
		.module('prisma.controllers')
		.controller('DefaultWithImageTabController', DefaultWithImageTabController);

	DefaultWithImageTabController.$inject = ['$log', '$rootScope', '$state', 'task'];

	function DefaultWithImageTabController ($log, $rootScope, $state, task) {
		var vm = this;

		vm.$onInit = function() {
			methods();
			variables();
			listeners();
		}

		function methods () {
			vm.activateImage = activateImage
		}

		function variables () {
			vm.data = task.data[$state.current.url];
			// activate first image if there are any images
			if (vm.data.images[0] !== undefined) {
				vm.data.images[0].active = true;
			}
		}

		function listeners () { }

		////////////////

		function activateImage (imageId) {
			$rootScope.$broadcast('change-image', {imageId: imageId});
		}
	}
})();
