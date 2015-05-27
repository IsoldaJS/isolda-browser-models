var assert = require('assert');
var _ = require('lodash');

var Model = require('../src/model');
var Collection = require('../src/collection');

describe("Model", function() {
  var proxy = Model.extend();
  var klass = Collection.extend({
    url : function() { return '/collection'; }
  });
  var doc, collection;

  beforeEach(function() {
    doc = new proxy({
      id     : '1-the-tempest',
      title  : "The Tempest",
      author : "Bill Shakespeare",
      length : 123
    });
    collection = new klass();
    collection.add(doc);

    require('./_util').setupSync(this);
  });

  afterEach(function () {
    require('./_util').restoreSync();
  })

  it("should call `initialize`", function() {
    var AModel = Model.extend({
      initialize: function() {
        this.one = 1;
        assert.equal(this.collection, collection);
      }
    });
    var model = new AModel({}, {collection: collection});
    assert.equal(model.one, 1);
    assert.equal(model.collection, collection);
  });

  it("should call `initialize` with attributes and options", function() {
    var AModel = Model.extend({
      initialize: function(attributes, options) {
        this.one = options.one;
      }
    });
    var model = new AModel({}, {one: 1});
    assert.equal(model.one, 1);
  });

  it("should call `initialize` with parsed attributes", function() {
    var AModel = Model.extend({
      parse: function(attrs) {
        attrs.value += 1;
        return attrs;
      }
    });
    var model = new AModel({value: 1}, {parse: true});
    assert.equal(model.get('value'), 2);
  });

  it("should call `initialize` with defaults", function() {
    var AModel = Model.extend({
      defaults: {
        first_name: 'Unknown',
        last_name: 'Unknown'
      }
    });
    var model = new AModel({'first_name': 'John'});
    assert.equal(model.get('first_name'), 'John');
    assert.equal(model.get('last_name'), 'Unknown');
  });

  it("should support `parse` that returns `null`", function() {
    var AModel = Model.extend({
      parse: function(attrs) {
        attrs.value += 1;
        return null;
      }
    });
    var model = new AModel({value: 1}, {parse: true});
    assert.equal(JSON.stringify(model.toJSON()), "{}");
  });

  it("should properly build URLs", function() {
    doc.urlRoot = null;
    assert.equal(doc.url(), '/collection/1-the-tempest');
    doc.collection.url = '/collection/';
    assert.equal(doc.url(), '/collection/1-the-tempest');
    doc.collection = null;
    assert.throws(function() { doc.url(); });
    doc.collection = collection;
  });

  it("should properly build URL when using urlRoot, and uri encoding", function() {
    var AModel = Model.extend({
      urlRoot: '/collection'
    });
    var model = new AModel();
    assert.equal(model.url(), '/collection');
    model.set({id: '+1+'});
    assert.equal(model.url(), '/collection/%2B1%2B');
  });

  it("should properly build URL when using urlRoot as a function to determine urlRoot at runtime", function() {
    var AModel = Model.extend({
      urlRoot: function() {
        return '/nested/' + this.get('parent_id') + '/collection';
      }
    });

    var model = new AModel({parent_id: 1});
    assert.equal(model.url(), '/nested/1/collection');
    model.set({id: 2});
    assert.equal(model.url(), '/nested/1/collection/2');
  });

  it("should support lodash methods", function() {
    var model = new Model({ 'foo': 'a', 'bar': 'b', 'baz': 'c' });
    var model2 = model.clone();
    assert.deepEqual(model.keys(), ['foo', 'bar', 'baz']);
    assert.deepEqual(model.values(), ['a', 'b', 'c']);
    assert.deepEqual(model.invert(), { 'a': 'foo', 'b': 'bar', 'c': 'baz' });
    assert.deepEqual(model.pick('foo', 'baz'), {'foo': 'a', 'baz': 'c'});
    assert.deepEqual(model.omit('foo', 'bar'), {'baz': 'c'});
  });

  it("should support chaining", function() {
    var model = new Model({ a: 0, b: 1, c: 2 });
    assert.deepEqual(model.chain().pick("a", "b", "c").values().compact().value(), [1, 2]);
  });

  it("should support `clone`", function() {
    var a = new Model({ 'foo': 1, 'bar': 2, 'baz': 3});
    var b = a.clone();
    assert.equal(a.get('foo'), 1);
    assert.equal(a.get('bar'), 2);
    assert.equal(a.get('baz'), 3);
    assert.equal(b.get('foo'), a.get('foo'), "Foo should be the same on the clone.");
    assert.equal(b.get('bar'), a.get('bar'), "Bar should be the same on the clone.");
    assert.equal(b.get('baz'), a.get('baz'), "Baz should be the same on the clone.");
    a.set({foo : 100});
    assert.equal(a.get('foo'), 100);
    assert.equal(b.get('foo'), 1, "Changing a parent attribute does not change the clone.");

    var foo = new Model({p: 1});
    var bar = new Model({p: 2});
    bar.set(foo.clone().attributes, {unset: true});
    assert.equal(foo.get('p'), 1);
    assert.equal(bar.get('p'), undefined);
  });

  it("should support `isNew`", function() {
    var a = new Model({ 'foo': 1, 'bar': 2, 'baz': 3});
    assert.ok(a.isNew(), "it should be new");
    a = new Model({ 'foo': 1, 'bar': 2, 'baz': 3, 'id': -5 });
    assert.ok(!a.isNew(), "any defined ID is legal, negative or positive");
    a = new Model({ 'foo': 1, 'bar': 2, 'baz': 3, 'id': 0 });
    assert.ok(!a.isNew(), "any defined ID is legal, including zero");
    assert.ok( new Model({          }).isNew(), "is true when there is no id");
    assert.ok(!new Model({ 'id': 2  }).isNew(), "is false for a positive integer");
    assert.ok(!new Model({ 'id': -5 }).isNew(), "is false for a negative integer");
  });

  it("should support `get`", function() {
    assert.equal(doc.get('title'), 'The Tempest');
    assert.equal(doc.get('author'), 'Bill Shakespeare');
  });

  it("should support `escape`", function() {
    assert.equal(doc.escape('title'), 'The Tempest');
    doc.set({audience: 'Bill & Bob'});
    assert.equal(doc.escape('audience'), 'Bill &amp; Bob');
    doc.set({audience: 'Tim > Joan'});
    assert.equal(doc.escape('audience'), 'Tim &gt; Joan');
    doc.set({audience: 10101});
    assert.equal(doc.escape('audience'), '10101');
    doc.unset('audience');
    assert.equal(doc.escape('audience'), '');
  });

  it("should support `has`", function() {
    var model = new Model();

    assert.strictEqual(model.has('name'), false);

    model.set({
      '0': 0,
      '1': 1,
      'true': true,
      'false': false,
      'empty': '',
      'name': 'name',
      'null': null,
      'undefined': undefined
    });

    assert.strictEqual(model.has('0'), true);
    assert.strictEqual(model.has('1'), true);
    assert.strictEqual(model.has('true'), true);
    assert.strictEqual(model.has('false'), true);
    assert.strictEqual(model.has('empty'), true);
    assert.strictEqual(model.has('name'), true);

    model.unset('name');

    assert.strictEqual(model.has('name'), false);
    assert.strictEqual(model.has('null'), false);
    assert.strictEqual(model.has('undefined'), false);
  });

  it("should support `matches`", function() {
    var model = new Model();

    assert.strictEqual(model.matches({'name': 'Jonas', 'cool': true}), false);

    model.set({name: 'Jonas', 'cool': true});

    assert.strictEqual(model.matches({'name': 'Jonas'}), true);
    assert.strictEqual(model.matches({'name': 'Jonas', 'cool': true}), true);
    assert.strictEqual(model.matches({'name': 'Jonas', 'cool': false}), false);
  });

  it("should support `matches` with predicate", function() {
    var model = new Model({a: 0});

    assert.strictEqual(model.matches(function(attr) {
      return attr.a > 1 && attr.b != null;
    }), false);

    model.set({a: 3, b: true});

    assert.strictEqual(model.matches(function(attr) {
      return attr.a > 1 && attr.b != null;
    }), true);
  });

  it("should support `set` and `unset`", function() {
    var a = new Model({id: 'id', foo: 1, bar: 2, baz: 3});
    var changeCount = 0;
    a.on("change:foo", function() { changeCount += 1; });
    a.set({'foo': 2});
    assert.ok(a.get('foo') == 2, "Foo should have changed.");
    assert.ok(changeCount == 1, "Change count should have incremented.");
    a.set({'foo': 2}); // set with value that is not new shouldn't fire change event
    assert.ok(a.get('foo') == 2, "Foo should NOT have changed, still 2");
    assert.ok(changeCount == 1, "Change count should NOT have incremented.");

    a.validate = function(attrs) {
      assert.equal(attrs.foo, void 0, "validate:true passed while unsetting");
    };
    a.unset('foo', {validate: true});
    assert.equal(a.get('foo'), void 0, "Foo should have changed");
    delete a.validate;
    assert.ok(changeCount == 2, "Change count should have incremented for unset.");

    a.unset('id');
    assert.equal(a.id, undefined, "Unsetting the id should remove the id property.");
  });

  it("should fix jashkenas/backbone#2030 - set with failed validate, followed by another set triggers change", function () {
    var attr = 0, main = 0, error = 0;
    var AModel = Model.extend({
      validate: function (attr) {
        if (attr.x > 1) {
          error++;
          return "this is an error";
        }
      }
    });
    var model = new AModel({x:0});
      model.on('change:x', function () { attr++; });
      model.on('change', function () { main++; });
      model.set({x:2}, {validate:true});
      model.set({x:1}, {validate:true});
      assert.deepEqual([attr, main, error], [1, 1, 1]);
  });

  it("`set` should trigger changes in the correct order", function() {
    var value = null;
    var model = new Model();
    model.on('last', function(){ value = 'last'; });
    model.on('first', function(){ value = 'first'; });
    model.trigger('first');
    model.trigger('last');
    assert.equal(value, 'last');
  });

  it("should set falsy values in the correct order", function() {
    var model = new Model({result: 'result'});
    model.on('change', function() {
      assert.equal(model.changed.result, void 0);
      assert.equal(model.previous('result'), false);
    });
    model.set({result: void 0}, {silent: true});
    model.set({result: null}, {silent: true});
    model.set({result: false}, {silent: true});
    model.set({result: void 0});
  });

  it("should allow nested set triggers with the correct options", function() {
    var model = new Model();
    var o1 = {};
    var o2 = {};
    var o3 = {};
    model.on('change', function(__, options) {
      switch (model.get('a')) {
      case 1:
        assert.equal(options, o1);
        return model.set('a', 2, o2);
      case 2:
        assert.equal(options, o2);
        return model.set('a', 3, o3);
      case 3:
        assert.equal(options, o3);
      }
    });
    model.set('a', 1, o1);
  });

  it("should allow multiple unsets", function() {
    var i = 0;
    var counter = function(){ i++; };
    var model = new Model({a: 1});
    model.on("change:a", counter);
    model.set({a: 2});
    model.unset('a');
    model.unset('a');
    assert.equal(i, 2, 'Unset does not fire an event for missing attributes.');
  });

  it("should support `unset` and `changedAttributes`", function() {
    var model = new Model({a: 1});
    model.on('change', function() {
      assert.ok('a' in model.changedAttributes(), 'changedAttributes should contain unset properties');
    });
    model.unset('a');
  });

  it("should allow using a non-default id attribute.", function() {
    var MongoModel = Model.extend({idAttribute : '_id'});
    var model = new MongoModel({id: 'eye-dee', _id: 25, title: 'Model'});
    assert.equal(model.get('id'), 'eye-dee');
    assert.equal(model.id, 25);
    assert.equal(model.isNew(), false);
    model.unset('_id');
    assert.equal(model.id, undefined);
    assert.equal(model.isNew(), true);
  });

  it("should allow setting an alternative cid prefix", function() {
    var AModel = Model.extend({
      cidPrefix: 'm'
    });
    var model = new AModel();

    assert.equal(model.cid.charAt(0), 'm');

    model = new Model();
    assert.equal(model.cid.charAt(0), 'c');

    var ACollection = Collection.extend({
      model: AModel
    });
    var collection = new ACollection([{id: 'c5'}, {id: 'c6'}, {id: 'c7'}]);

    assert.equal(collection.get('c6').cid.charAt(0), 'm');
    collection.set([{id: 'c6', value: 'test'}], {
      merge: true,
      add: true,
      remove: false
    });
    assert.ok(collection.get('c6').has('value'));
  });

  it("should allow setting an empty string", function() {
    var model = new Model({name : "Model"});
    model.set({name : ''});
    assert.equal(model.get('name'), '');
  });

  it("should allow setting an object", function() {
    var model = new Model({
      custom: { foo: 1 }
    });
    var count = 0;
    model.on('change', function() {
      count += 1;
    });
    model.set({
      custom: { foo: 1 } // no change should be fired
    });
    model.set({
      custom: { foo: 2 } // change event should be fired
    });
    assert.equal(count, 1);
  });

  it("should support `clear`", function() {
    var changed;
    var model = new Model({id: 1, name : "Model"});
    model.on("change:name", function(){ changed = true; });
    model.on("change", function() {
      var changedAttrs = model.changedAttributes();
      assert.ok('name' in changedAttrs);
    });
    model.clear();
    assert.equal(changed, true);
    assert.equal(model.get('name'), undefined);
  });

  it("should support `defaults`", function() {
    var Defaulted = Model.extend({
      defaults: {
        "one": 1,
        "two": 2
      }
    });
    var model = new Defaulted({two: undefined});
    assert.equal(model.get('one'), 1);
    assert.equal(model.get('two'), 2);
    Defaulted = Model.extend({
      defaults: function() {
        return {
          "one": 3,
          "two": 4
        };
      }
    });
    model = new Defaulted({two: undefined});
    assert.equal(model.get('one'), 3);
    assert.equal(model.get('two'), 4);
  });

  it("should support `change`, `hasChanged`, `changedAttributes`, `previous`, `previousAttributes`", function() {
    var model = new Model({name: "Tim", age: 10});
    assert.deepEqual(model.changedAttributes(), false);
    model.on('change', function() {
      assert.ok(model.hasChanged('name'), 'name changed');
      assert.ok(!model.hasChanged('age'), 'age did not');
      assert.ok(_.isEqual(model.changedAttributes(), {name : 'Rob'}), 'changedAttributes returns the changed attrs');
      assert.equal(model.previous('name'), 'Tim');
      assert.ok(_.isEqual(model.previousAttributes(), {name : "Tim", age : 10}), 'previousAttributes is correct');
    });
    assert.equal(model.hasChanged(), false);
    assert.equal(model.hasChanged(undefined), false);
    model.set({name : 'Rob'});
    assert.equal(model.get('name'), 'Rob');
  });

  it("should support `changedAttributes`", function() {
    var model = new Model({a: 'a', b: 'b'});
    assert.deepEqual(model.changedAttributes(), false);
    assert.equal(model.changedAttributes({a: 'a'}), false);
    assert.equal(model.changedAttributes({a: 'b'}).a, 'b');
  });

  it("should support `change` with options", function() {
    var value;
    var model = new Model({name: 'Rob'});
    model.on('change', function(model, options) {
      value = options.prefix + model.get('name');
    });
    model.set({name: 'Bob'}, {prefix: 'Mr. '});
    assert.equal(value, 'Mr. Bob');
    model.set({name: 'Sue'}, {prefix: 'Ms. '});
    assert.equal(value, 'Ms. Sue');
  });

  it("should support `change` after `initialize`", function () {
    var changed = 0;
    var attrs = {id: 1, label: 'c'};
    var obj = new Model(attrs);
    obj.on('change', function() { changed += 1; });
    obj.set(attrs);
    assert.equal(changed, 0);
  });

  it("should allow `save` within `change` event", function () {
    var env = this;
    var model = new Model({firstName : "Taylor", lastName: "Swift"});
    model.url = '/test';
    model.on('change', function () {
      model.save();
      assert.ok(_.isEqual(env.syncArgs.model, model));
    });
    model.set({lastName: 'Hicks'});
  });

  it("should do `validate` after `save`", function() {
    var lastError, model = new Model();
    model.validate = function(attrs) {
      if (attrs.admin) return "Can't change admin status.";
    };
    model.sync = function(method, model, options) {
      options.success.call(this, {admin: true});
    };
    model.on('invalid', function(model, error) {
      lastError = error;
    });
    model.save(null);

    assert.equal(lastError, "Can't change admin status.");
    assert.equal(model.validationError, "Can't change admin status.");
  });

  it("should do `save`", function() {
    var env = this;
    doc.save({title : "Henry V"});
    assert.equal(env.syncArgs.method, 'update');
    assert.ok(_.isEqual(env.syncArgs.model, doc));
  });

  it("`save`, `fetch`, `destroy` should trigger error event when an error occurs", function () {
    var model = new Model();
    var count = 0;
    model.on('error', function () {
      count += 1;
    });
    model.sync = function (method, model, options) {
      options.error();
    };
    model.save({data: 2, id: 1});
    model.fetch();
    model.destroy();
    assert.equal(count, 3);
  });

  it("should fix jashkenas/backbone#3283 - `save`, `fetch`, `destroy` call success with context", function () {
    var model = new Model();
    var obj = {};
    var options = {
      context: obj,
      success: function() {
        assert.equal(this, obj);
      }
    };
    model.sync = function (method, model, options) {
      options.success.call(options.context);
    };
    model.save({data: 2, id: 1}, options);
    model.fetch(options);
    model.destroy(options);
  });

  it("should fix jashkenas/backbone#3283 - `save`, `fetch`, `destroy` calls error with context", function () {
    var model = new Model();
    var obj = {};
    var options = {
      context: obj,
      error: function() {
        assert.equal(this, obj);
      }
    };
    model.sync = function (method, model, options) {
      options.error.call(options.context);
    };
    model.save({data: 2, id: 1}, options);
    model.fetch(options);
    model.destroy(options);
  });

  it("should support `save` with PATCH", function() {
    var env = this;
    doc.clear().set({id: 1, a: 1, b: 2, c: 3, d: 4});
    doc.save();
    assert.equal(env.syncArgs.method, 'update');
    assert.equal(env.syncArgs.options.attrs, undefined);

    doc.save({b: 2, d: 4}, {patch: true});
    assert.equal(env.syncArgs.method, 'patch');
    assert.equal(_.size(env.syncArgs.options.attrs), 2);
    assert.equal(env.syncArgs.options.attrs.d, 4);
    assert.equal(env.syncArgs.options.attrs.a, undefined);
    assert.equal(env.ajaxSettings.data, "{\"b\":2,\"d\":4}");
  });

  it("should support `save` with PATCH and different attrs", function() {
    var env = this;
    doc.clear().save({b: 2, d: 4}, {patch: true, attrs: {B: 1, D: 3}});
    assert.equal(env.syncArgs.options.attrs.D, 3);
    assert.equal(env.syncArgs.options.attrs.d, undefined);
    assert.equal(env.ajaxSettings.data, "{\"B\":1,\"D\":3}");
    assert.deepEqual(doc.attributes, {b: 2, d: 4});
  });

  it("should support `save` in positional style", function() {
    var model = new Model();
    model.sync = function(method, model, options) {
      options.success();
    };
    model.save('title', 'Twelfth Night');
    assert.equal(model.get('title'), 'Twelfth Night');
  });

  it("should support `save` with non-object success response", function () {
    var model = new Model();
    var count = 0;
    model.sync = function(method, model, options) {
      options.success('', options);
      options.success(null, options);
    };
    model.save({testing:'empty'}, {
      success: function (model) {
        assert.deepEqual(model.attributes, {testing:'empty'});
        count += 1;
      }
    });
    assert.equal(count, 2);
  });

  it("should support `save` with `wait` and supplied `id`", function() {
    var env = this;
    var AModel = Model.extend({
      urlRoot: '/collection'
    });
    var model = new AModel();
    model.save({id: 42}, {wait: true});
    assert.equal(env.ajaxSettings.url, '/collection/42');
  });

  it("`save` should pass extra options to success callback", function () {
    var env = this;
    var SpecialSyncModel = Model.extend({
      sync: function (method, model, options) {
        _.extend(options, { specialSync: true });
        return Model.prototype.sync.call(this, method, model, options);
      },
      urlRoot: '/test'
    });

    var model = new SpecialSyncModel();

    var onSuccess = function (model, response, options) {
      assert.ok(options.specialSync, "Options were passed correctly to callback");
    };

    model.save(null, { success: onSuccess });
    env.ajaxSettings.success();
  });

  it("should support `fetch`", function() {
    var env = this;
    doc.fetch();
    assert.equal(env.syncArgs.method, 'read');
    assert.ok(_.isEqual(env.syncArgs.model, doc));
  });

  it("`fetch` should pass extra options to `success` callback", function () {
    var env = this;
    var SpecialSyncModel = Model.extend({
      sync: function (method, model, options) {
        _.extend(options, { specialSync: true });
        return Model.prototype.sync.call(this, method, model, options);
      },
      urlRoot: '/test'
    });

    var model = new SpecialSyncModel();

    var onSuccess = function (model, response, options) {
      assert.ok(options.specialSync, "Options were passed correctly to callback");
    };

    model.fetch({ success: onSuccess });
    env.ajaxSettings.success();
  });

  it("should support `destroy`", function() {
    var env = this;
    doc.destroy();
    assert.equal(env.syncArgs.method, 'delete');
    assert.ok(_.isEqual(env.syncArgs.model, doc));

    var newModel = new Model();
    assert.equal(newModel.destroy(), false);
  });

  it("`destroy` should pass extra options to `success` callback", function () {
    var env = this;
    var SpecialSyncModel = Model.extend({
      sync: function (method, model, options) {
        _.extend(options, { specialSync: true });
        return Model.prototype.sync.call(this, method, model, options);
      },
      urlRoot: '/test'
    });

    var model = new SpecialSyncModel({ id: 'id' });

    var onSuccess = function (model, response, options) {
      assert.ok(options.specialSync, "Options were passed correctly to callback");
    };

    model.destroy({ success: onSuccess });
    env.ajaxSettings.success();
  });

  it("should support non-persisted `destroy`", function() {
    var a = new Model({ 'foo': 1, 'bar': 2, 'baz': 3});
    a.sync = function() { throw "should not be called"; };
    a.destroy();
    assert.ok(true, "non-persisted model should not call sync");
  });

  it("should `validate`", function() {
    var lastError;
    var model = new Model();
    model.validate = function(attrs) {
      if (attrs.admin != this.get('admin')) return "Can't change admin status.";
    };
    model.on('invalid', function(model, error) {
      lastError = error;
    });
    var result = model.set({a: 100});
    assert.equal(result, model);
    assert.equal(model.get('a'), 100);
    assert.equal(lastError, undefined);
    result = model.set({admin: true});
    assert.equal(model.get('admin'), true);
    result = model.set({a: 200, admin: false}, {validate:true});
    assert.equal(lastError, "Can't change admin status.");
    assert.equal(result, false);
    assert.equal(model.get('a'), 100);
  });

  it("should `validate` on unset and clear", function() {
    var error;
    var model = new Model({name: "One"});
    model.validate = function(attrs) {
      if (!attrs.name) {
        error = true;
        return "No thanks.";
      }
    };
    model.set({name: "Two"});
    assert.equal(model.get('name'), 'Two');
    assert.equal(error, undefined);
    model.unset('name', {validate: true});
    assert.equal(error, true);
    assert.equal(model.get('name'), 'Two');
    model.clear({validate:true});
    assert.equal(model.get('name'), 'Two');
    delete model.validate;
    model.clear();
    assert.equal(model.get('name'), undefined);
  });

  it("should `validate` with error callback", function() {
    var lastError, boundError;
    var model = new Model();
    model.validate = function(attrs) {
      if (attrs.admin) return "Can't change admin status.";
    };
    model.on('invalid', function(model, error) {
      boundError = true;
    });
    var result = model.set({a: 100}, {validate:true});
    assert.equal(result, model);
    assert.equal(model.get('a'), 100);
    assert.equal(model.validationError, null);
    assert.equal(boundError, undefined);
    result = model.set({a: 200, admin: true}, {validate:true});
    assert.equal(result, false);
    assert.equal(model.get('a'), 100);
    assert.equal(model.validationError, "Can't change admin status.");
    assert.equal(boundError, true);
  });

  it("should fix jashkenas/backbone#459 - defaults always extend attrs", function() {
    var count = 0;
    var Defaulted = Model.extend({
      defaults: {one: 1},
      initialize : function(attrs, opts) {
        assert.equal(this.attributes.one, 1);
        count += 1;
      }
    });
    var providedattrs = new Defaulted({});
    var emptyattrs = new Defaulted();
    assert.equal(count, 2);
  });

  it("should inherit class properties", function() {
    var Parent = Model.extend({
      instancePropSame: function() {},
      instancePropDiff: function() {}
    }, {
      classProp: function() {}
    });
    var Child = Parent.extend({
      instancePropDiff: function() {}
    });

    var adult = new Parent();
    var kid   = new Child();

    assert.equal(Child.classProp, Parent.classProp);
    assert.notEqual(Child.classProp, undefined);

    assert.equal(kid.instancePropSame, adult.instancePropSame);
    assert.notEqual(kid.instancePropSame, undefined);

    assert.notEqual(Child.prototype.instancePropDiff, Parent.prototype.instancePropDiff);
    assert.notEqual(Child.prototype.instancePropDiff, undefined);
  });

  it("nested `change` events shouldn't clobber previous attributes", function() {
    new Model()
    .on('change:state', function(model, newState) {
      assert.equal(model.previous('state'), undefined);
      assert.equal(newState, 'hello');
      // Fire a nested change event.
      model.set({other: 'whatever'});
    })
    .on('change:state', function(model, newState) {
      assert.equal(model.previous('state'), undefined);
      assert.equal(newState, 'hello');
    })
    .set({state: 'hello'});
  });

  it("`hasChanged` / `set` should use same comparison", function() {
    var changed = 0, model = new Model({a: null});
    model.on('change', function() {
      assert.ok(this.hasChanged('a'));
    })
    .on('change:a', function() {
      changed++;
    })
    .set({a: undefined});
    assert.equal(changed, 1);
  });

  it("should fix jashkenas/backbone#582, jashkenas/backbone#425 - change:attribute callbacks should fire after all changes have occurred", function() {
    var model = new Model();

    var assertion = function() {
      assert.equal(model.get('a'), 'a');
      assert.equal(model.get('b'), 'b');
      assert.equal(model.get('c'), 'c');
    };

    model.on('change:a', assertion);
    model.on('change:b', assertion);
    model.on('change:c', assertion);

    model.set({a: 'a', b: 'b', c: 'c'});
  });

  it("should fix jashkenas/backbone#871, set with attributes property", function() {
    var model = new Model();
    model.set({attributes: true});
    assert.ok(model.has('attributes'));
  });

  it("should set value regardless of assert.equality/change", function() {
    var model = new Model({x: []});
    var a = [];
    model.set({x: a});
    assert.ok(model.get('x') === a);
  });

  it("set same value should not trigger change", function() {
    var model = new Model({x: 1});
    model.on('change change:x', function() { throw new Error('This should not be called'); });
    model.set({x: 1});
    model.set({x: 1});
  });

  it("`unset` should not fire a change for undefined attributes", function() {
    var model = new Model({x: undefined});
    model.on('change:x', function(){ throw new Error('This should not be called'); });
    model.unset('x');
  });

  it("should allow setting undefined values", function() {
    var model = new Model({x: undefined});
    assert.ok('x' in model.attributes);
  });

  it("`hasChanged` should work outside of change events, and true within", function() {
    var model = new Model({x: 1});
    model.on('change:x', function() {
      assert.ok(model.hasChanged('x'));
      assert.equal(model.get('x'), 1);
    });
    model.set({x: 2}, {silent: true});
    assert.ok(model.hasChanged());
    assert.equal(model.hasChanged('x'), true);
    model.set({x: 1});
    assert.ok(model.hasChanged());
    assert.equal(model.hasChanged('x'), true);
  });

  it("`hasChanged` should get cleared on the following `set`", function() {
    var model = new Model();
    model.set({x: 1});
    assert.ok(model.hasChanged());
    model.set({x: 1});
    assert.ok(!model.hasChanged());
    model.set({x: 2});
    assert.ok(model.hasChanged());
    model.set({});
    assert.ok(!model.hasChanged());
  });

  it("`save` with `wait` should succeed without `validate`", function() {
    var env = this;
    var model = new Model();
    model.url = '/test';
    model.save({x: 1}, {wait: true});
    assert.ok(env.syncArgs.model === model);
  });

  it("`save` without `wait` shouldn't set invalid attributes", function () {
    var model = new Model();
    model.validate = function () { return 1; };
    model.save({a: 1});
    assert.equal(model.get('a'), void 0);
  });

  it("`save` shouldn't validate twice", function () {
    var model = new Model();
    var times = 0;
    model.sync = function () {};
    model.validate = function () { ++times; };
    model.save({});
    assert.equal(times, 1);
  });

  it("`hasChanged` should ignore falsey keys", function() {
    var model = new Model();
    model.set({x: true}, {silent: true});
    assert.ok(!model.hasChanged(0));
    assert.ok(!model.hasChanged(''));
  });

  it("should support `previous` for falsey keys", function() {
    var model = new Model({0: true, '': true});
    model.set({0: false, '': false}, {silent: true});
    assert.equal(model.previous(0), true);
    assert.equal(model.previous(''), true);
  });

  it("`save` with `wait` should send correct attributes", function() {
    var env = this;
    var changed = 0;
    var model = new Model({x: 1, y: 2});
    model.url = '/test';
    model.on('change:x', function() { changed++; });
    model.save({x: 3}, {wait: true});
    assert.deepEqual(JSON.parse(env.ajaxSettings.data), {x: 3, y: 2});
    assert.equal(model.get('x'), 1);
    assert.equal(changed, 0);
    env.syncArgs.options.success({});
    assert.equal(model.get('x'), 3);
    assert.equal(changed, 1);
  });

  it("a failed `save` with `wait` shouldn't leave attributes behind", function() {
    var model = new Model;
    model.url = '/test';
    model.save({x: 1}, {wait: true});
    assert.equal(model.get('x'), void 0);
  });

  it("should fix jashkenas/backbone#1030 - `save` with `wait` results in correct attributes if success is called during sync", function() {
    var model = new Model({x: 1, y: 2});
    model.sync = function(method, model, options) {
      options.success();
    };
    model.on("change:x", function() { assert.ok(true); });
    model.save({x: 3}, {wait: true});
    assert.equal(model.get('x'), 3);
  });

  it("`save` with `wait` should validate attributes", function() {
    var model = new Model();
    model.url = '/test';
    model.validate = function() { assert.ok(true); };
    model.save({x: 1}, {wait: true});
  });

  it("`save` should turn on `parse` flag", function () {
    var AModel = Model.extend({
      sync: function(method, model, options) { assert.ok(options.parse); }
    });
    new AModel().save();
  });

  it("should support nested `set` during `'change:attr'`", function() {
    var events = [];
    var model = new Model();
    model.on('all', function(event) { events.push(event); });
    model.on('change', function() {
      model.set({z: true}, {silent:true});
    });
    model.on('change:x', function() {
      model.set({y: true});
    });
    model.set({x: true});
    assert.deepEqual(events, ['change:y', 'change:x', 'change']);
    events = [];
    model.set({z: true});
    assert.deepEqual(events, []);
  });

  it("nested `change` should only fire once", function() {
    var model = new Model();
    var count = 0;
    model.on('change', function() {
      count += 1;
      model.set({x: true});
    });
    model.set({x: true});
    assert.equal(count, 1);
  });

  it("should support nested `set` during `'change'`", function() {
    var count = 0;
    var model = new Model();
    model.on('change', function() {
      switch(count++) {
        case 0:
          assert.deepEqual(this.changedAttributes(), {x: true});
          assert.equal(model.previous('x'), undefined);
          model.set({y: true});
          break;
        case 1:
          assert.deepEqual(this.changedAttributes(), {x: true, y: true});
          assert.equal(model.previous('x'), undefined);
          model.set({z: true});
          break;
        case 2:
          assert.deepEqual(this.changedAttributes(), {x: true, y: true, z: true});
          assert.equal(model.previous('y'), undefined);
          break;
        default:
          throw new Error('This should not be reached');
      }
    });
    model.set({x: true});
  });

  it("should support nested `change` with `silent`", function() {
    var count = 0;
    var model = new Model();
    model.on('change:y', function() { assert.ok(false); });
    model.on('change', function() {
      switch(count++) {
        case 0:
          assert.deepEqual(this.changedAttributes(), {x: true});
          model.set({y: true}, {silent: true});
          model.set({z: true});
          break;
        case 1:
          assert.deepEqual(this.changedAttributes(), {x: true, y: true, z: true});
          break;
        case 2:
          assert.deepEqual(this.changedAttributes(), {z: false});
          break;
        default:
          throw new Error('This should not be reached');
      }
    });
    model.set({x: true});
    model.set({z: false});
  });

  it("should support nested `change:attr` with silent", function() {
    var model = new Model();
    model.on('change:y', function(){
      throw new Error('This should not be reached');
    });
    model.on('change', function() {
      model.set({y: true}, {silent: true});
      model.set({z: true});
    });
    model.set({x: true});
  });

  it("should support multiple nested changes with `silent`", function() {
    var model = new Model();
    model.on('change:x', function() {
      model.set({y: 1}, {silent: true});
      model.set({y: 2});
    });
    model.on('change:y', function(model, val) {
      assert.equal(val, 2);
    });
    model.set({x: true});
  });

  it("should support multiple nested changes with `silent` - part 2", function() {
    var changes = [];
    var model = new Model();
    model.on('change:b', function(model, val) { changes.push(val); });
    model.on('change', function() {
      model.set({b: 1});
    });
    model.set({b: 0});
    assert.deepEqual(changes, [0, 1]);
  });

  it("should support basic `silent` change semantics", function() {
    var model = new Model();
    var count = 0;
    model.set({x: 1});
    model.on('change', function(){ count += 1; });
    model.set({x: 2}, {silent: true});
    model.set({x: 1});
    assert.equal(count, 1);
  });

  it("should support nested `set` multiple times", function() {
    var model = new Model();
    var count = 0;
    model.on('change:b', function() {
      count += 1;
    });
    model.on('change:a', function() {
      model.set({b: true});
      model.set({b: true});
    });
    model.set({a: true});
    assert.equal(count, 1);
  });

  it("should fix jashkenas/backbone#1122 - clear does not alter options.", function() {
    var model = new Model();
    var options = {};
    model.clear(options);
    assert.ok(!options.unset);
  });

  it("should fix jashkenas/backbone#1122 - unset does not alter options.", function() {
    var model = new Model();
    var options = {};
    model.unset('x', options);
    assert.ok(!options.unset);
  });

  it("should fix jashkenas/backbone#1355 - `options` is passed to success callbacks", function() {
    var model = new Model();
    var count = 0;
    var opts = {
      success: function( model, resp, options ) {
        assert.ok(options);
        count += 1;
      }
    };
    model.sync = function(method, model, options) {
      options.success();
    };
    model.save({id: 1}, opts);
    model.fetch(opts);
    model.destroy(opts);
    assert.equal(count, 3);
  });

  it("should fix jashkenas/backbone#1412 - Trigger 'sync' event.", function() {
    var model = new Model({id: 1});
    var count = 0;
    model.sync = function (method, model, options) { options.success(); };
    model.on('sync', function(){
      count += 1;
    });
    model.fetch();
    model.save();
    model.destroy();
    assert.equal(count, 3);
  });

  it("should fix jashkenas/backbone#1365 - Destroy: New models execute success callback.", function(done) {
    var count = 0;
    new Model()
    .on('sync', function() { throw new Error('This should not be called'); })
    .on('destroy', function(){ count += 1; })
    .destroy({ success: function(){
        assert.equal(count, 1);
        done();
    }});
  });

  it("should fix jashkenas/backbone#1433 - Save: An invalid model cannot be persisted.", function() {
    var model = new Model;
    model.validate = function(){ return 'invalid'; };
    model.sync = function(){ throw new Error('This should not be called'); };
    assert.strictEqual(model.save(), false);
  });

  it("should fix jashkenas/backbone#1377 - Save without attrs triggers 'error'.", function() {
    var count = 0;
    var AModel = Model.extend({
      url: '/test/',
      sync: function(method, model, options){ options.success(); },
      validate: function(){ return 'invalid'; }
    });
    var model = new AModel({id: 1});
    model.on('invalid', function(){ count += 1; });
    model.save();
    assert.equal(count, 1);
  });

  it("should fix jashkenas/backbone#1545 - `undefined` can be passed to a model constructor without coersion", function() {
    var AModel = Model.extend({
      defaults: { one: 1 },
      initialize : function(attrs, opts) {
        assert.equal(attrs, undefined);
      }
    });
    var emptyattrs = new Model();
    var undefinedattrs = new Model(undefined);
  });

  it("should fix jashkenas/backbone#1478 - Model `save` does not trigger change on unchanged attributes", function(done) {
    var AModel = Model.extend({
      sync: function(method, model, options) {
        setTimeout(function(){
          options.success();
          done();
        }, 0);
      }
    });

    new AModel({x: true})
    .on('change:x', function(){ throw new Error('This should not be called'); })
    .save(null, {wait: true});
  });

  it("should fix jashkenas/backbone#1664 - Changing from one value, silently to another, back to original triggers a change.", function() {
    var model = new Model({x:1});
    var count = 0;
    model.on('change:x', function() { count += 1; });
    model.set({x:2},{silent:true});
    model.set({x:3},{silent:true});
    model.set({x:1});
    assert.equal(count, 1);
  });

  it("should fix jashkenas/backbone#1664 - multiple silent changes nested inside a change event", function() {
    var changes = [];
    var model = new Model();
    model.on('change', function() {
      model.set({a:'c'}, {silent:true});
      model.set({b:2}, {silent:true});
      model.unset('c', {silent:true});
    });
    model.on('change:a change:b change:c', function(model, val) { changes.push(val); });
    model.set({a:'a', b:1, c:'item'});
    assert.deepEqual(changes, ['a',1,'item']);
    assert.deepEqual(model.attributes, {a: 'c', b: 2});
  });

  it("should fix jashkenas/backbone#1791 - `attributes` is available for `parse`", function() {
    var AModel = Model.extend({
      parse: function() { this.has('a'); } // shouldn't throw an error
    });
    var model = new AModel(null, {parse: true});
  });

  it("silent changes in last `change` event back to original should trigger change", function() {
    var changes = [];
    var model = new Model();
    model.on('change:a change:b change:c', function(model, val) { changes.push(val); });
    model.on('change', function() {
      model.set({a:'c'}, {silent:true});
    });
    model.set({a:'a'});
    assert.deepEqual(changes, ['a']);
    model.set({a:'a'});
    assert.deepEqual(changes, ['a', 'a']);
  });

  it("should fix jashkenas/backbone#1943 change calculations should use `_.isEqual`", function() {
    var model = new Model({a: {key: 'value'}});
    model.set('a', {key:'value'}, {silent:true});
    assert.equal(model.changedAttributes(), false);
  });

  it("should fix jashkenas/backbone#1964 - final `change` event is always fired, regardless of interim changes", function () {
    var model = new Model();
    var count = 0;
    model.on('change:property', function() {
      model.set('property', 'bar');
    });
    model.on('change', function() {
      count += 1;
    });
    model.set('property', 'foo');
    assert.equal(count, 1);
  });

  it("should support `isValid`", function() {
    var model = new Model({valid: true});
    model.validate = function(attrs) {
      if (!attrs.valid) return "invalid";
    };
    assert.equal(model.isValid(), true);
    assert.equal(model.set({valid: false}, {validate:true}), false);
    assert.equal(model.isValid(), true);
    model.set({valid:false});
    assert.equal(model.isValid(), false);
    assert.ok(!model.set('valid', false, {validate: true}));
  });

  it("should fix jashkenas/backbone#1179 - `isValid` returns true in the absence of validate.", function() {
    var model = new Model();
    model.validate = null;
    assert.ok(model.isValid());
  });

  it("should fix jashkenas/backbone#1961 - Creating a model with {validate:true} will call `validate` and use the error callback", function () {
    var AModel = Model.extend({
      validate: function (attrs) {
        if (attrs.id === 1) return "This shouldn't happen";
      }
    });
    var model = new AModel({id: 1}, {validate: true});
    assert.equal(model.validationError, "This shouldn't happen");
  });

  it("`toJSON` should receive attrs during save(..., {wait: true})", function() {
    var AModel = Model.extend({
      url: '/test',
      toJSON: function() {
        assert.strictEqual(this.attributes.x, 1);
        return _.clone(this.attributes);
      }
    });
    var model = new AModel();
    model.save({x: 1}, {wait: true});
  });

  it("should fix jashkenas/backbone#2034 - nested `set` with `silent` only triggers one change", function() {
    var count = 0;
    var model = new Model();
    model.on('change', function() {
      model.set({b: true}, {silent: true});
      count += 1;
    });
    model.set({a: true});
    assert.equal(count, 1);
  });

});
