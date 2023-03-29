(function () {
	'use strict';

	angular
		.module('prisma.services')
		.service('filterService', filterService);

	filterService.$inject = ['$log', '$rootScope', '$localStorage'];

	function filterService ($log, $rootScope, $localStorage) {
		var service = this;

		service.setFilter = setFilter;
		service.getFilter = getFilter;
		service.resetFilter = resetFilter;

		service.setRawFilter = setRawFilter;
		service.getRawFilter = getRawFilter;

		service.isFilterSet = isFilterSet;

		var filterTemplate = {
			users: [], // [ 'name', 'cads_ids' ]
			timespans: [], // in ms
		};
		var filter;
		var rawFilter;
		var filterIsSet = false;

		function init () {
			loadFilterFromStorage();
		}
		////////////////

		function setFilter (newFilter) {
			filter = angular.extend({}, filterTemplate, newFilter);
			filterIsSet = true;
			$localStorage.filter = filter;
			$rootScope.$broadcast('update-filter');
		}

		function getFilter () {
			return filter;
		}

		function resetFilter () {
			setFilter({});
			setRawFilter(undefined);
			filterIsSet = false;
			$rootScope.$broadcast('reset-filter');
		}

		function setRawFilter (newRawFilter) {
			rawFilter = newRawFilter;
			$localStorage.rawFilter = rawFilter;
		}

		function getRawFilter () {
			return rawFilter;
		}

		function isFilterSet () {
			return filterIsSet;
		}

		function loadFilterFromStorage () {
			filter = $localStorage.filter;
			filterIsSet = !isFilterEmpty(filter);
			if (!filterIsSet)
				filter = filterTemplate;
			else {
				if (filter.timespans !== undefined)
					filter.timespans = _.map(filter.timespans, function (timespan) {
						return [
							new Date (timespan[0]),
							new Date (timespan[1]),
						]
					});
			}

			rawFilter = $localStorage.rawFilter;
			if (rawFilter !== undefined && rawFilter.date !== undefined)
				rawFilter.date = new Date (rawFilter.date);

		}

		function isFilterEmpty(filter) {
			return (!filter || (!filter.timespans && !filter.users)) ||
				(!filter.users && filter.timespans && !filter.timespans.length) ||
				(!filter.timespans && filter.users && !filter.users.length) ||
				(filter.users && !filter.users.length && filter.timespans && !filter.timespans.length);
		}

		init();
	}
})();
