exports.model = require('./model');
exports.collection = require('./collection');

var sync = require('./sync');

exports.setSync = function (fn) {
  sync.sync = fn;
};

exports.getSync = function (fn) {
  return sync.sync;
};

var defaultSync = require('./xhr-sync');
exports.getAjax = defaultSync.getAjax;
exports.setAjax = defaultSync.setAjax;
