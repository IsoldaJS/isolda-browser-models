var browserModels = require('..');
var originalSync = browserModels.getSync();

var emulateHTTP;
var emulateJSON;


exports.setupSync = function (env) {
  require('../src/xhr-sync').setAjax(function (settings) {
    env.ajaxSettings = settings;
  });

  emulateHTTP = originalSync.emulateHTTP;
  emulateJSON = originalSync.emulateJSON;

  var sync = function(method, model, options) {
    env.syncArgs = {
      method: method,
      model: model,
      options: options
    };
    originalSync.emulateHTTP = sync.emulateHTTP;
    originalSync.emulateJSON = sync.emulateJSON;
    originalSync.apply(this, arguments);
  };

  browserModels.setSync(sync);
  return sync;
};

exports.restoreSync = function () {
  browserModels.setSync(originalSync);
  originalSync.emulateHTTP = emulateHTTP;
  originalSync.emulateJSON = emulateJSON;
};
