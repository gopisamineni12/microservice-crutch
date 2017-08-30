'use strict';

module.exports = function microservices(_, app, inject, logging, options) {
  var log = logging.getLogger('microservice-crutch.microservices');
  log.debug('Initializing ih-util-microservices module.');

  return inject.resolve('ih-util-microservices')
    .then(function (microservices) {
      return inject(microservices);
    })
    .then(function (ms) {
      return inject(ms.AmqpTransport)
        .then(function (transport) {
          var shutdownHandler = _.partial(onShutdown, ms, transport);
          app.once('shutdown-last', shutdownHandler);
          ms.on('error', onError);
          transport.on('error', onError);
          transport.on('warn', onWarn);
          transport.on('receive-message', onReceiveMessage);
          transport.on('receive-reply', onReceiveReply);
          transport.on('send-message', onSendMessage);
          transport.on('send-reply', onSendReply);
          return ms.useTransport(transport, options);
        })
        .return(ms);
    })
    .then(function (ms) {
      var bindings = {};
      return _.defaults({
        bindings: bindings,
        bind: function (rk, action, opts) {
          bindings[rk] = action;
          return ms.bind(rk, action, opts);
        },
      }, ms);
    });

  function onError(error) {
    log.error(error);
    if (app.listeners('error').length > 0) {
      return _.partial(app.emit, 'error').apply(app, arguments);
    } else {
      throw error;
    }
  }

  function onWarn(message){
    log.warn(message);
  }

  function onReceiveMessage(messageContext){
    log.info('Received message.', messageContext);
  }

  function onSendReply(messageContext){
    log.info('Sending reply.', messageContext);
  }

  function onReceiveReply(messageContext){
    log.debug('Received reply.', messageContext);
  }

  function onSendMessage(messageContext){
    log.debug('Sending message.', messageContext);
  }

  function onShutdown(ms, transport) {
    log.debug('Shutting down ih-util-microservices module.');
    ms.removeListener('error', onError);
    transport.removeListener('error', onError);
    transport.removeListener('warn', onWarn);
    transport.removeListener('receive-message', onReceiveMessage);
    transport.removeListener('receive-reply', onReceiveReply);
    transport.removeListener('send-message', onSendMessage);
    transport.removeListener('send-reply', onSendReply);
    ms.dispose();
  }
};
