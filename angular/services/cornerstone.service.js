(function () {
	'use strict';

	angular
		.module('prisma.services')
		.service('cornerstoneService', cornerstoneService);

  cornerstoneService.$inject = [];

	function cornerstoneService () {
    this.register = register;
    this.sendActionByInstanceId = function (instanceId, action, payload) {
      var instance = instances[instanceId];
      sendAction(instance, action, payload);
    };

    var instances = [];
    var initialized = false;
    var targetOrigin = '*';
    var messageContext = 'cornerstone_viewer'; // shared "secret"

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
      var message = event.data
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
      if (message.type === 'event') {
        switch (message.name) {
          case 'handshake':
            instance.viewerId = message.params.viewerId;
            sendEvent(instance, 'initialized');
            break;
          default:
            console.log('cornerstone viewer event', {name: message.name, params: message.params});
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
