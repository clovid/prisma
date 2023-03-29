(function () {
	'use strict';

	angular
		.module('prisma.controllers')
		.controller('UserDialogController', UserDialogController);

	UserDialogController.$inject = ['$log', '$mdDialog', 'usersService', 'modules'];

	function UserDialogController ($log, $mdDialog, usersService, modules) {
		var vm = this;

		vm.modules = modules;
		vm.user = {};
		vm.selectedModules = [];

		vm.cancel = function () {
			$mdDialog.cancel();
		}

		vm.submit = function () {
			var user;
			return usersService.store(vm.user).then(function (createdUser) {
				user = createdUser;
				if (vm.selectedModules.length)
					return usersService.updateModules(user, vm.selectedModules);
			}).then(function () {
				return $mdDialog.hide(user);
			});
		}

		vm.refreshPassword = function () {
			vm.user.password = Math.random().toString(36).slice(2, 8);
		}

		vm.refreshPassword();
	}
})();
