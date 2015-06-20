var _ = require('lodash');

var utils = require('./utils');

var ajax;
if (typeof XMLHttpRequest !== 'undefined') {
  ajax = require('@isoldajs/browser-ajax');
} else {
  ajax = function () {
    console.warn("AJAX function not implemented, sync won't happen");
  }
}


// Map from CRUD to HTTP
var methodMap = {
  'create': 'POST',
  'update': 'PUT',
  'patch':  'PATCH',
  'delete': 'DELETE',
  'read':   'GET'
};

//
// Turn on `sync.emulateHTTP` in order to send `PUT` and `DELETE` requests
// as `POST`, with a `_method` parameter containing the true HTTP method,
// as well as `sync.emulateJSON` to make all requests with the body as `application/x-www-form-urlencoded`
// instead of `application/json` with the model in a param named `model`.
// Useful when interfacing with server-side languages like **PHP** that make
// it difficult to read the body of `PUT` requests.
module.exports = sync = function(method, model, options) {
  var type = methodMap[method];

  // Default options, unless specified.
  _.defaults(options || (options = {}), {
    emulateHTTP: sync.emulateHTTP,
    emulateJSON: sync.emulateJSON
  });

  // Default JSON-request options.
  var params = { type: type, dataType: 'json' };

  // Ensure that we have a URL.
  if (!options.url) {
    params.url = _.result(model, 'url') || utils.urlError();
  }

  // Ensure that we have the appropriate request data.
  if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
    params.contentType = 'application/json';
    params.data = JSON.stringify(options.attrs || model.toJSON(options));
  }

  // For older servers, emulate JSON by encoding the request into an HTML-form.
  if (options.emulateJSON) {
    params.contentType = 'application/x-www-form-urlencoded';
    params.data = params.data ? {model: params.data} : {};
  }

  // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
  // And an `X-HTTP-Method-Override` header.
  if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
    params.type = 'POST';
    if (options.emulateJSON) params.data._method = type;
    var beforeSend = options.beforeSend;
    options.beforeSend = function(xhr) {
      xhr.setRequestHeader('X-HTTP-Method-Override', type);
      if (beforeSend) return beforeSend.apply(this, arguments);
    };
  }

  // Don't process data on a non-GET request.
  if (params.type !== 'GET' && !options.emulateJSON) {
    params.processData = false;
  }

  // Pass along `textStatus` and `errorThrown` from Ajax.
  var error = options.error;
  options.error = function(xhr, textStatus, errorThrown) {
    options.textStatus = textStatus;
    options.errorThrown = errorThrown;
    if (error) error.call(options.context, xhr, textStatus, errorThrown);
  };

  // Make the request, allowing the user to override any Ajax options.
  var xhr = options.xhr = ajax(_.extend(params, options));
  model.trigger('request', model, xhr, options);
  return xhr;
};

sync.emulateHTTP = false;
sync.emulateJSON = false;

sync.getAjax = function () {
  return ajax;
};

sync.setAjax = function (fn) {
  ajax = fn;
};
