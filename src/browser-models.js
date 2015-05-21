var Model = exports.model = require('./model');
var Collection = exports.collection = require('./collection');

var utils = require('./utils');

exports.setSync = function (fn) {
  utils.sync = fn;
}
