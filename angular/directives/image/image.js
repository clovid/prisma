(function () {
	'use strict';

	angular
		.module('prisma.directives')
		.directive('ldImage', ldImage);

	ldImage.$inject = ['$timeout'];

	function ldImage ($timeout) {
		// Usage:
		//
		// Creates:
		//
		var directive = {
			bindToController: true,
			controller: Controller,
			controllerAs: 'vm',
			restrict: 'A',
			templateUrl: 'views/directives/image/image.html',
			scope: {
				image: '='
			},
			link: link,
		};
		return directive;

		function link (scope, element, attrs) {
			if (['meta', 'wsi'].includes(scope.vm.image.type)) {
				$timeout(function () {
					var iframe = element.find('iframe');
					scope.vm.registerIframe(iframe, scope.vm.image.type);
				});
			}
			element.bind('keydown keypress', function (event) {
				var keyLeft = 37;
				var keyRight = 39;
				if (event.which === keyLeft) {
					scope.vm.showPreviousSlice();
				}
				if (event.which === keyRight) {
					scope.vm.showNextSlice();
				}
			});
		}
	}

	Controller.$inject = ['$log', '$rootScope', '$scope', '$timeout', 'userService', 'omeroService', 'cornerstoneService', '$translate'];

	function Controller ($log, $rootScope, $scope, $timeout, userService, omeroService, cornerstoneService, $translate) {
		var vm = this;
		var activeSlice;

		vm.$onInit = function() {
			var activeSlice = vm.image.slices && vm.image.slices[vm.image.currentSlice];
			vm.lang = $translate.use();
			vm.state = {
				image: {
					visible: false,
					activeSlice: activeSlice,
					url: getUrl(vm.image, activeSlice),
					title: vm.image.title,
				},
				overlay: {
					visible: false,
					activeSlice: null,
					url: null,
					style: {},
				},
				marks: {
					data: [],
					visible: false,
				},
				questionId: null,
				debounceTimeouts: {},
			};
			vm.config = {
				invertMouseWheel: true,
				zoomLevels: 6,
				scalePerZoomLevel: 1.8,
				// TODO: what should be the neutral zoom level?
				neutralZoomLevel: 1,
				initialZoomToFit: {
					x: 0,
					y: 0,
					// TODO: other orientation
					width: vm.image.dimensions && vm.image.dimensions.x,
					height: vm.image.dimensions && vm.image.dimensions.y,
				},
				debounceTime: {
					updateUrl: 100,
					activateOverlay: 100,
				},
			};
			vm.model = {};
			vm.onMousedown = onMousedown;
			vm.showPreviousSlice = showPreviousSlice;
			vm.showNextSlice = showNextSlice;
			vm.registerIframe = registerIframe;
		}

		vm.$onDestroy = function() {
			vm.image.active = false;
		}

		function registerIframe(element, imageType) {
			if (imageType === 'wsi') {
				vm.state.image.iframeId = omeroService.register(element, handleEvent);
			}
			if (imageType === 'meta') {
				vm.state.image.iframeId = cornerstoneService.register(element, handleEvent);
			}
		}

		function handleEvent(event) {
			console.log('Handle event from iframe', event);
			if (event.resource === 'annotation') {
				var message = event.name === 'deselected' ? 'deselected-mark' : 'selected-mark';
				$rootScope.$broadcast(message, {
					imageId: vm.image.id,
					questionId: vm.state.questionId,
					mark: event.resourceId,
				});
			}
		}

		function getUrl(image, slice) {
			if (!slice || !slice.hash) {
				if (!image.url) {
					return;
				}
				return image.url + '?user_ticket=' + userService.token();
			}
			return 'images/' + slice.hash + '?user_ticket=' + userService.token();
		}

		$scope.$on('change-image', function (event, config) {
			if (config.imageId !== vm.image.id) {
				vm.image.active = false;
				// hide overlay
				if (vm.state.overlay.visible) {
					$rootScope.$broadcast('hide-overlay', {
						imageId: vm.image.id,
						questionId: vm.state.questionId,
						skipActivation: true,
					});
				}
				// hide marks
				if (vm.state.marks.visible) {
					$rootScope.$broadcast('hide-marks', {
						imageId: vm.image.id,
						questionId: vm.state.questionId,
						skipActivation: true,
					});
				}
				return;
			}
			vm.image.active = true;
		});

		$scope.$on('show-marks', function (event, config) {
			if (config.imageId !== vm.image.id || (vm.state.questionId && config.questionId !== vm.state.questionId)) {
				resetOverlayAndMarks();
			}
			performAction('show', 'marks', config);
		});

		$scope.$on('deselect-mark', function (event, config) {
			performAction('deselect', 'mark', config);
		});

		$scope.$on('select-mark', function (event, config) {
			performAction('select', 'mark', config);
		});

		$scope.$on('zoom-mark', function (event, config) {
			performAction('zoom', 'mark', config);
		});

		$scope.$on('hide-marks', function (event, config) {
			performAction('hide', 'marks', config);
		});

		$scope.$on('show-overlay', function (event, config) {
			if (config.imageId !== vm.image.id || (vm.state.questionId && config.questionId !== vm.state.questionId)) {
				resetOverlayAndMarks();
			}
			performAction('show', 'overlay', config);
		});

		$scope.$on('hide-overlay', function (event, config) {
			performAction('hide', 'overlay', config);
		});

		function showSlice(slice) {
			if (vm.state.image.activeSlice === slice) {
				return;
			}
			performAction('show', 'slice', {
				imageId: vm.image.id,
				slice: slice,
			});
		}

		function showPreviousSlice() {
			if (vm.state.image.activeSlice.i <= 0) {
				return;
			}
			showSlice(vm.image.slices[vm.state.image.activeSlice.i - 1]);
			$scope.$apply();
		}

		function showNextSlice() {
			if (vm.state.image.activeSlice.i + 1 >= vm.image.slices.length) {
				return;
			}
			showSlice(vm.image.slices[vm.state.image.activeSlice.i + 1]);
			$scope.$apply();
		}

		function performAction(action, resource, config) {
			if (!config.imageId || config.imageId !== vm.image.id) {
				if (!config.skipActivation) {
					vm.image.active = false;
				}
				return;
			}

			if (!config.skipActivation) {
				vm.image.active = true;
			}

			if (config.skipUpdate === false) {
				return;
			}

			if (!config.questionId) {
				// $log.error('Question ID missing', action, resource, config);
			}

			if (resource === 'marks') {
				if (action === 'show') {
					if (!config.marks || config.marks.length <= 0) {
						return;
					}
					vm.state.marks.data = config.marks;
					vm.state.marks.visible = true;
					vm.state.questionId = config.questionId;
					// add marks to slices
					// todo refactor for other orientation than z

					if (vm.image.type === 'wsi') {
						var marks = _.map(vm.state.marks.data, function (item) { return item.id; });
						omeroService.sendActionByInstanceId(vm.state.image.iframeId, 'show_annotations', {annotationIds: marks});
						omeroService.sendActionByInstanceId(vm.state.image.iframeId, 'zoom_to_annotations', {annotationIds: marks});
					} else if (vm.image.type === 'meta') {
						cornerstoneService.sendActionByInstanceId(vm.state.image.iframeId, 'show_points', {points: config.marks.map(({x,y,z}) => [x,y,z]), color: config.color});
					} else {
						var groupedMarks = _.reduce(config.marks, function (carry, item) {
							if (!carry[item[2]]) {
								carry[item[2]] = [];
							}
							carry[item[2]].push([item[0], item[1]]);
							return carry;
						}, {});
						_.each(groupedMarks, function (marks, key) {
							vm.image.slices[key].marks = marks;
						});

						if (vm.state.image.activeSlice.marks) {
							drawPlot(vm.state.marks.data, vm.state.image.activeSlice.i, vm.image.orientation);
						} else {
							var nearestGroupIndex = _.min(Object.keys(groupedMarks), function (index) {
								return Math.abs(vm.state.image.activeSlice.i - index);
							});
							var validSlice = vm.image.slices[nearestGroupIndex];
							performAction('show', 'slice', _.extend({}, config, {slice: validSlice}));
						}
					}
				} else {
					if (!vm.state.overlay.visible) {
						vm.state.questionId = null;
					}
					if (vm.state.marks.visible) {
						if (vm.image.type === 'wsi') {
							var marks = _.map(vm.state.marks.data, function (item) { return item.id; });
							omeroService.sendActionByInstanceId(vm.state.image.iframeId, 'hide_annotations', {annotationIds: marks});
						} else if (vm.image.type === 'meta') {
							cornerstoneService.sendActionByInstanceId(vm.state.image.iframeId, 'hide_points');
						} else {
							_.each(vm.image.slices, function (slice) {
								if (slice.marks) {
									slice.marks = undefined;
								}
							});
							hidePlot();
						}
					}
					vm.state.marks.visible = false;
				}
			}

			if (resource === 'mark') {
				if (action === 'deselect') {
					if (vm.image.type === 'wsi') {
						omeroService.sendActionByInstanceId(vm.state.image.iframeId, 'deselect_annotation', {annotationId: config.mark});
					} else if (vm.image.type === 'meta') {
						console.log('TODO: implement deselect-mark for meta images');
					} else {
						console.log('TODO: implement deselect-mark for images other that wsi');
					}
				}
				if (action === 'select') {
					if (vm.image.type === 'wsi') {
						omeroService.sendActionByInstanceId(vm.state.image.iframeId, 'pan_to_annotation', {annotationId: config.mark, select: true});
					} else if (vm.image.type === 'meta') {
						console.log('TODO: implement select-mark for meta images');
					} else {
						console.log('TODO: implement select-mark for images other that wsi');
					}
				}
				if (action === 'zoom') {
					if (vm.image.type === 'wsi') {
						omeroService.sendActionByInstanceId(vm.state.image.iframeId, 'zoom_to_annotation', {annotationId: config.mark, select: true});
					} else if (vm.image.type === 'meta') {
						console.log('TODO: implement zoom-mark for meta images');
					} else {
						console.log('TODO: implement zoom-mark for images other that wsi');
					}
				}
			}

			if (resource === 'overlay') {
				if (action === 'show') {
					if (!config.overlayId) {
						$log.error('Overlay ID missing:', action, resource, config, vm.image);
						return;
					}
					if (['wsi', 'meta'].includes(vm.image.type)) {
						var overlaySlice = config.overlayId;
					} else {
						var overlaySlice = _.findWhere(vm.state.image.activeSlice.overlays, {id: config.overlayId});
						if (!overlaySlice) {
							var currentIndex = vm.state.image.activeSlice.i;
							var overlayConfig = _.findWhere(vm.image.overlays, {id: config.overlayId});
							if (!overlayConfig) {
								$log.error('Overlay ID wrong:', action, resource, config, vm.image.overlays);
								return;
							}
							var offset = overlayConfig.offset[vm.image.orientation];
							var dimension = overlayConfig.dimensions[vm.image.orientation];
							if (currentIndex >= offset && currentIndex <= dimension + offset) {
								$log.error('Overlay not available:', action, resource, config, vm.state.image.activeSlice);
								return;
							}
							var validSliceIndex = Math.round(offset + (dimension / 2));
							var validSlice = vm.image.slices[validSliceIndex];
							performAction('show', 'slice', _.extend({}, config, {slice: validSlice}));
							overlaySlice = _.findWhere(vm.state.image.activeSlice.overlays, {id: config.overlayId});
						}
					}
					showOverlay(overlaySlice, config.questionId);
				} else {
					hideOverlay();
				}
			}

			if (resource === 'slice') {
				if (action === 'show') {
					if (!config.slice) {
						$log.error('Slice missing:', action, resource, config, vm.image);
						return;
					}
					debounce('updateUrl', function () { updateUrl(config.slice); }, vm.config.debounceTime.updateUrl);
					vm.state.image.activeSlice = config.slice;
					if (vm.state.overlay.activeSlice) {
						var overlay = _.findWhere(vm.state.image.activeSlice.overlays, {id: vm.state.overlay.activeSlice.id});
						debounce('activateOverlay', function () { activateOverlay(overlay) }, vm.config.debounceTime.activateOverlay);
					}
					if (vm.state.marks.visible) {
						hidePlot();
						var visiblePoints = _.filter(vm.state.marks.data, function (mark) {
							return getOpacity(vm.state.image.activeSlice.i, mark[2]) > 0.1;
						});
						if (visiblePoints.length > 0) {
							drawPlot(visiblePoints, vm.state.image.activeSlice.i, vm.image.orientation);
						}
					}
				}
			}
		}

		function updateUrl(imageSlice) {
			var newUrl = getUrl(vm.state.image, imageSlice);
			if (!newUrl || vm.state.image.url === newUrl)
				return;
			vm.state.image.url = newUrl;
		}

		function showOverlay(overlaySlice, questionId) {
			activateOverlay(overlaySlice);
			vm.state.overlay.visible = true;
			vm.state.questionId = questionId;
		}

		function activateOverlay(overlaySlice) {
			if (vm.state.overlay.activeSlice === overlaySlice) {
				return;
			}
			if (!overlaySlice) {
				vm.state.overlay.url = null;
				return;
			}

			if (vm.image.type === 'wsi') {
				vm.state.overlay.annotationId = overlaySlice;
				omeroService.sendActionByInstanceId(vm.state.image.iframeId, 'show_annotations', {annotationIds: overlaySlice.split(',')});
			} else if (vm.image.type === 'meta') {
				vm.state.overlay.annotationId = overlaySlice;
				cornerstoneService.sendActionByInstanceId(vm.state.image.iframeId, 'show_overlay', {overlayId: overlaySlice});
			} else {
				vm.state.overlay.activeSlice = overlaySlice;
				var overlayUrl = getUrl(vm.state.image, overlaySlice);
				if (!overlayUrl || vm.state.overlay.url === overlayUrl)
					return;
				var overlayConfig = _.findWhere(vm.image.overlays, {id: overlaySlice.id});
				vm.state.overlay.url = overlayUrl;
				vm.state.overlay.style = {
					// TODO: other orientation
					top: overlayConfig.offset.y,
					left: overlayConfig.offset.x,
				}
			}
		}

		function hideOverlay() {
			vm.state.overlay.visible = false;
			if (!vm.state.marks.visible) {
				vm.state.questionId = null;
			}

			if (vm.image.type === 'wsi' && vm.state.overlay.annotationId) {
				omeroService.sendActionByInstanceId(vm.state.image.iframeId, 'hide_annotations', {annotationIds: vm.state.overlay.annotationId.split(',')});
				vm.state.overlay.annotationId = null;
			}
			if (vm.image.type === 'meta' && vm.state.overlay.annotationId) {
				cornerstoneService.sendActionByInstanceId(vm.state.image.iframeId, 'hide_overlay', {overlayId: vm.state.overlay.annotationId});
			}
		}

		function resetOverlayAndMarks() {
			if (vm.state.overlay.visible) {
				performAction('hide', 'overlay', {
						imageId: vm.image.id,
						questionId: vm.state.questionId,
						skipActivation: true,
				});
			}
			if (vm.state.marks.visible) {
				performAction('hide', 'marks', {
						imageId: vm.image.id,
						questionId: vm.state.marks.questionId,
						skipActivation: true,
				});
			}
		}

		function drawPlot (marks, currentIndex, orientation) {
			marks = marks || [];

			if (marks.length === 0) {
				return;
			}

			// TODO: what about z?
			var circleRadius = Math.round(Math.min(vm.image.dimensions.x, vm.image.dimensions.y) / 90);
			var borderWidth = 1;
			var width = _.max(marks, function (mark) { return mark[0]; })[0] + circleRadius + borderWidth;
			var height = _.max(marks, function (mark) { return mark[1]; })[1] + circleRadius + borderWidth;

			var el = d3.select('#ld-image-' + vm.image.id + ' .js-map');

			var map = el.append('svg')
				.attr('width', width)
				.attr('height', height);

			// Define the div for the tooltip
			var div = el.append('div')
				.attr('class', 'tooltip')
				.style('opacity', 0);

			map.append('image')
				.attr('width', width)
				.attr('height', height);

			map.selectAll('.hotspot')
				.data(
					marks.map(function (mark) {
						return {
							coordinates: mark,
							opacity: getOpacity(currentIndex, mark[2]),
						};
					})
				)
				.enter().append('circle')
					// .on('mouseover', function (d) {
					// 	div.transition()
					// 		.duration(200)
					// 		.style('opacity', .9);
					// 	div.html(d.size + ' Datensätze')
					// 		.style('left', d.coordinates[0] + (d.size * 10) + 10 + 'px')
					// 		.style('top', d.coordinates[1] - (d.size * 10) + 'px');
					// })
					// .on('mouseout', function (d) {
					// 	div.transition()
					// 		.duration(200)
					// 		.style('opacity', 0);
					// })
					.attr('class', 'hotspot')
					// .attr('r', 50)
					.each(function (d) {
						d3.select(this)
							.attr('cx', d.coordinates[0])
							.attr('cy', d.coordinates[1])
							.attr('r', circleRadius)
							.style('fill', 'red')
							.style('stroke', 'white')
							.style('opacity', d.opacity);
					});

		}

		function hidePlot() {
			var el = d3.select('#ld-image-' + vm.image.id + ' .js-map');
			el.select('svg').remove();
		}

		function onMousedown(event, slice) {
			showSlice(slice);
			var scrollbarElement = $(event.target).parent();
			scrollbarElement.children().on('mousemove', onMousemove);
			scrollbarElement.on('mouseup', onMouseupFn(scrollbarElement));
			scrollbarElement.on('mouseleave', onMouseleaveFn(scrollbarElement));
		}

		function onMousemove(event) {
			var slice = $(event.target).scope().slice;
			if (vm.state.image.activeSlice !== slice) {
				showSlice(slice);
				$scope.$apply();
			}
			event.stopPropagation();
			event.preventDefault();
		}

		function onMouseupFn(element) {
			return function (event) {
				// remove onMousemove
				element.children().off('mousemove');
				element.off('mouseup');
				element.off('mouseleave');
			}
		}

		function onMouseleaveFn(element) {
			var onMouseup = onMouseupFn(element);
			return function (event) {
				onMouseup(event);
			}
		}

		function getOpacity(currentIndex, pointIndex) {
			var distance = Math.abs(currentIndex - pointIndex);
			return distance > 0 ? ( 1 / (1.5 * distance)) : 0.9
		}

		function debounce(action, func, wait, invokeApply) {
			wait = wait || 100;
			if (vm.state.debounceTimeouts[action]) {
				$timeout.cancel(vm.state.debounceTimeouts[action]);
			}
			vm.state.debounceTimeouts[action] = $timeout(func, wait, invokeApply);
		}

	}
})();
