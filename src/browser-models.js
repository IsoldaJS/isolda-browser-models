var Model = exports.model = require('./model');
var Collection = exports.collection = require('./collection');

var sync = require('./sync');

exports.setSync = function (fn) {
  sync.sync = fn;
};
