var assert = require('assert');
var _ = require('lodash');

var browserModels = require('..');
var Model = require("../src/collection");
var Collection = require("../src/collection");

describe("Default XHR sync", function () {
  var Library = Collection.extend({
    url : function() { return "/library"; }
  });
  var library, sync;

  var attrs = {
    title  : "The Tempest",
    author : "Bill Shakespeare",
    length : 123
  };

  beforeEach(function() {
    library = new Library();
    library.create(attrs, {wait: false});

    sync = require('./_util').setupSync(this);
  });

  afterEach(function() {
    require('./_util').restoreSync();
  });

  it("should support `read`", function() {
    library.fetch();
    assert.equal(this.ajaxSettings.url, "/library");
    assert.equal(this.ajaxSettings.type, "GET");
    assert.equal(this.ajaxSettings.dataType, "json");
    assert.ok(_.isEmpty(this.ajaxSettings.data));
  });

  it("should support passing data", function() {
    library.fetch({data: {a: "a", one: 1}});
    assert.equal(this.ajaxSettings.url, "/library");
    assert.equal(this.ajaxSettings.data.a, "a");
    assert.equal(this.ajaxSettings.data.one, 1);
  });

  it("should support `create`", function() {
    assert.equal(this.ajaxSettings.url, "/library");
    assert.equal(this.ajaxSettings.type, "POST");
    assert.equal(this.ajaxSettings.dataType, "json");
    var data = JSON.parse(this.ajaxSettings.data);
    assert.equal(data.title, "The Tempest");
    assert.equal(data.author, "Bill Shakespeare");
    assert.equal(data.length, 123);
  });

  it("should support `update`", function() {
    library.first().save({id: "1-the-tempest", author: "William Shakespeare"});
    assert.equal(this.ajaxSettings.url, "/library/1-the-tempest");
    assert.equal(this.ajaxSettings.type, "PUT");
    assert.equal(this.ajaxSettings.dataType, "json");
    var data = JSON.parse(this.ajaxSettings.data);
    assert.equal(data.id, "1-the-tempest");
    assert.equal(data.title, "The Tempest");
    assert.equal(data.author, "William Shakespeare");
    assert.equal(data.length, 123);
  });

  it("should support `update` with `emulateHTTP` and `emulateJSON`", function() {
    library.first().save({id: "2-the-tempest", author: "Tim Shakespeare"}, {
      emulateHTTP: true,
      emulateJSON: true
    });
    assert.equal(this.ajaxSettings.url, "/library/2-the-tempest");
    assert.equal(this.ajaxSettings.type, "POST");
    assert.equal(this.ajaxSettings.dataType, "json");
    assert.equal(this.ajaxSettings.data._method, "PUT");
    var data = JSON.parse(this.ajaxSettings.data.model);
    assert.equal(data.id, "2-the-tempest");
    assert.equal(data.author, "Tim Shakespeare");
    assert.equal(data.length, 123);
  });

  it("should support `update` with just `emulateHTTP`", function() {
    library.first().save({id: "2-the-tempest", author: "Tim Shakespeare"}, {
      emulateHTTP: true
    });
    assert.equal(this.ajaxSettings.url, "/library/2-the-tempest");
    assert.equal(this.ajaxSettings.type, "POST");
    assert.equal(this.ajaxSettings.contentType, "application/json");
    var data = JSON.parse(this.ajaxSettings.data);
    assert.equal(data.id, "2-the-tempest");
    assert.equal(data.author, "Tim Shakespeare");
    assert.equal(data.length, 123);
  });

  it("should support `update` with just `emulateJSON`", function() {
    library.first().save({id: "2-the-tempest", author: "Tim Shakespeare"}, {
      emulateJSON: true
    });
    assert.equal(this.ajaxSettings.url, "/library/2-the-tempest");
    assert.equal(this.ajaxSettings.type, "PUT");
    assert.equal(this.ajaxSettings.contentType, "application/x-www-form-urlencoded");
    var data = JSON.parse(this.ajaxSettings.data.model);
    assert.equal(data.id, "2-the-tempest");
    assert.equal(data.author, "Tim Shakespeare");
    assert.equal(data.length, 123);
  });

  it("should support reading model", function() {
    library.first().save({id: "2-the-tempest", author: "Tim Shakespeare"});
    library.first().fetch();
    assert.equal(this.ajaxSettings.url, "/library/2-the-tempest");
    assert.equal(this.ajaxSettings.type, "GET");
    assert.ok(_.isEmpty(this.ajaxSettings.data));
  });

  it("should support `destroy`", function() {
    library.first().save({id: "2-the-tempest", author: "Tim Shakespeare"});
    library.first().destroy({wait: true});
    assert.equal(this.ajaxSettings.url, "/library/2-the-tempest");
    assert.equal(this.ajaxSettings.type, "DELETE");
    assert.equal(this.ajaxSettings.data, null);
  });

  it("should support `destroy` with `emulateHTTP`", function() {
    library.first().save({id: "2-the-tempest", author: "Tim Shakespeare"});
    library.first().destroy({
      emulateHTTP: true,
      emulateJSON: true
    });
    assert.equal(this.ajaxSettings.url, "/library/2-the-tempest");
    assert.equal(this.ajaxSettings.type, "POST");
    assert.equal(JSON.stringify(this.ajaxSettings.data), '{"_method":"DELETE"}');
  });

  it("should support `urlError`", function() {
    var model = new Model();
    assert.throws(function() {
      model.fetch();
    });
    model.fetch({url: "/one/two"});
    assert.equal(this.ajaxSettings.url, "/one/two");
  });

  it("should fix jashkenas/backbone#1052 - `options` is optional.", function() {
    var model = new Model();
    model.url = "/test";
    sync("create", model);
  });

  it("should support customizing ajax", function() {
    var count = 0;
    var ajax = browserModels.getAjax();
    browserModels.setAjax(function(settings){
      assert.strictEqual(settings.url, "/test");
      count += 1;
    });
    var model = new Model();
    model.url = "/test";
    sync("create", model);
    assert.equal(count, 1);
    browserModels.setAjax(ajax);
  });

  it("should call provided error callback on error", function() {
    var count = 0;
    var model = new Model();
    model.url = "/test";
    sync("read", model, {
      error: function() { count += 1; }
    });
    this.ajaxSettings.error();
    assert.equal(count, 1);
  });

  it("should use `sync.emulateHTTP` as default.", function() {
    var model = new Model();
    model.url = "/test";

    sync.emulateHTTP = true;
    model.sync("create", model);
    assert.strictEqual(this.ajaxSettings.emulateHTTP, true);

    sync.emulateHTTP = false;
    model.sync("create", model);
    assert.strictEqual(this.ajaxSettings.emulateHTTP, false);
  });

  it("should use `sync.emulateJSON` as default.", function() {
    var model = new Model();
    model.url = "/test";

    sync.emulateJSON = true;
    model.sync("create", model);
    assert.strictEqual(this.ajaxSettings.emulateJSON, true);

    sync.emulateJSON = false;
    model.sync("create", model);
    assert.strictEqual(this.ajaxSettings.emulateJSON, false);
  });

  it("should fix jashkenas/backbone#1756 - Call user provided beforeSend function.", function() {
    sync.emulateHTTP = true;
    var model = new Model();
    model.url = "/test";
    var xhr = {
      setRequestHeader: function(header, value) {
        assert.strictEqual(header, "X-HTTP-Method-Override");
        assert.strictEqual(value, "DELETE");
      }
    };
    model.sync("delete", model, {
      beforeSend: function(_xhr) {
        assert.ok(_xhr === xhr);
        return false;
      }
    });
    assert.strictEqual(this.ajaxSettings.beforeSend(xhr), false);
  });

  it("should fix jashkenas/backbone#2928 - Pass along `textStatus` and `errorThrown`.", function() {
    var model = new Model();
    model.url = "/test";
    model.on("error", function(model, xhr, options) {
      assert.strictEqual(options.textStatus, "textStatus");
      assert.strictEqual(options.errorThrown, "errorThrown");
    });
    model.fetch();
    this.ajaxSettings.error({}, "textStatus", "errorThrown");
  });

});
