(function () {
	'use strict';

	angular
		.module('prisma.services')
		.service('omeroService', omeroService);

	omeroService.$inject = ['$rootScope'];

	function omeroService ($rootScope) {
    this.register = register;
    this.sendActionByInstanceId = function (instanceId, action, payload) {
      var instance = instances[instanceId];
      sendAction(instance, action, payload);
    };

    var instances = [];
    var initialized = false;
    var targetOrigin = '*';
    var messageContext = 'clovid_integration'; // shared "secret"

    if (!initialized) {
      init();
    }
		////////////////

    function register (element, handleEvent) {
      instances.push({
        el: element.get(0),
        eventHandler: handleEvent
      });
      return instances.length - 1;
    }

    function init () {
      initialized = true;
      window.addEventListener('message', handleMessage);
    }

    function handleMessage (event) {
      if (!event.data || !event.data.context || event.data.context !== messageContext) {
        return;
      }
      var omeroMessage = event.data
      var instance;
      for (var i = 0; i < instances.length; i++) {
        if (instances[i].el.contentWindow === event.source) {
          instance = instances[i];
          break;
        }
      }
      if (!instance) {
        return;
      }
      if (omeroMessage.type === 'event') {
        switch (omeroMessage.name) {
          case 'handshake':
            instance.viewerId = omeroMessage.params.iviewerid;
            sendEvent(instance, 'initialized');
            break;
          case 'VIEWER_INITIALIZED':
            sendEvent(instance, 'prepare');
            break;
          case 'annotations_loaded':
            sendAction(instance, 'hide_all_annotations');
            sendAction(instance, 'disable_interaction');
            break;
          case 'regions_created':
            sendAction(instance, 'enable_comments');
            break;
          case 'REGIONS_PROPERTY_CHANGED':
            var properties = omeroMessage.params.properties;
            if (properties && properties.length === 1 &&properties[0] === 'selected') {
              if (omeroMessage.params.shapes.length > 1) {
                console.log('Handle multiple shape selection');
              } else {
                var shapeId = omeroMessage.params.shapes[0];
                var event = {
                  name: omeroMessage.params.values[0] ? 'selected' : 'deselected',
                  resource: 'annotation',
                  resourceId: shapeId,
                }
                if (instance.eventHandler) {
                  instance.eventHandler(event);
			            $rootScope.$digest();
                }
              }
            }
            break;

          default:
            // console.log('iViewer event', {name: omeroMessage.name, params: omeroMessage.params})
            break;
        }
      }
    }

    function sendEvent(instance, name) {
      sendMessage(instance, 'event', name);
    }

    function sendAction(instance, name, payload) {
      sendMessage(instance, 'action', name, payload);
    }

    function sendMessage(instance, type, name, payload) {
      instance.el.contentWindow.postMessage(
        {
          context: messageContext,
          target: instance.viewerId,
          type: type,
          name: name,
          payload: payload,
        },
        targetOrigin
      );
    }
	}
})();
