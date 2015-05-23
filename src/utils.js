_ = require('lodash');

var array = [];
var slice = array.slice;

// Proxy Underscore methods to a class' prototype using a
// particular attribute as the data argument
var addMethod = function(length, method, attribute) {
  switch (length) {
    case 1: return function() {
      return _[method](this[attribute]);
    };
    case 2: return function(value) {
      return _[method](this[attribute], value);
    };
    case 3: return function(iteratee, context) {
      return _[method](this[attribute], iteratee, context);
    };
    case 4: return function(iteratee, defaultVal, context) {
      return _[method](this[attribute], iteratee, defaultVal, context);
    };
    default: return function() {
      var args = slice.call(arguments);
      args.unshift(this[attribute]);
      return _[method].apply(_, args);
    };
  }
};

exports.addUnderscoreMethods = function(Class, methods, attribute) {
  _.each(methods, function(length, method) {
    if (_[method]) Class.prototype[method] = addMethod(length, method, attribute);
  });
};

// Helper function to correctly set up the prototype chain for subclasses.
// Similar to `goog.inherits`, but uses a hash of prototype properties and
// class properties to be extended.
exports.extend = function(protoProps, staticProps) {
  var parent = this;
  var child;

  // The constructor function for the new subclass is either defined by you
  // (the "constructor" property in your `extend` definition), or defaulted
  // by us to simply call the parent constructor.
  if (protoProps && _.has(protoProps, 'constructor')) {
    child = protoProps.constructor;
  } else {
    child = function(){ return parent.apply(this, arguments); };
  }

  // Add static properties to the constructor function, if supplied.
  _.extend(child, parent, staticProps);

  // Set the prototype chain to inherit from `parent`, without calling
  // `parent` constructor function.
  var Surrogate = function(){ this.constructor = child; };
  Surrogate.prototype = parent.prototype;
  child.prototype = new Surrogate();

  // Add prototype properties (instance properties) to the subclass,
  // if supplied.
  if (protoProps) _.extend(child.prototype, protoProps);

  // Set a convenience property in case the parent's prototype is needed
  // later.
  child.__super__ = parent.prototype;

  return child;
};

// Throw an error when a URL is needed, and none is supplied.
exports.urlError = function() {
  throw new Error('A "url" property or function must be specified');
};

// Wrap an optional error callback with a fallback error event.
exports.wrapError = function(model, options) {
  var error = options.error;
  options.error = function(resp) {
    if (error) error.call(options.context, model, resp, options);
    model.trigger('error', model, resp, options);
  };
};
