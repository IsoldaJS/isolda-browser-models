var assert = require('assert');
var _ = require('lodash');

var browserModels = require('..');
var Model = require('../src/model');
var Collection = require('../src/collection');

describe ("Collection", function() {
  var a, b, c, d, e, col, otherCol;

  beforeEach(function() {
    a         = new Model({id: 3, label: 'a'});
    b         = new Model({id: 2, label: 'b'});
    c         = new Model({id: 1, label: 'c'});
    d         = new Model({id: 0, label: 'd'});
    e         = null;
    col       = new Collection([a,b,c,d]);
    otherCol  = new Collection();
    
    require('./_util').setupSync(this);
  });
  
  afterEach(function () {
    require('./_util').restoreSync();
  });

  it("new and sort", function() {
    var counter = 0;
    col.on('sort', function(){ counter++; });
    assert.deepEqual(col.pluck('label'), ['a', 'b', 'c', 'd']);
    col.comparator = function(a, b) {
      return a.id > b.id ? -1 : 1;
    };
    col.sort();
    assert.equal(counter, 1);
    assert.deepEqual(col.pluck('label'), ['a', 'b', 'c', 'd']);
    col.comparator = function(model) { return model.id; };
    col.sort();
    assert.equal(counter, 2);
    assert.deepEqual(col.pluck('label'), ['d', 'c', 'b', 'a']);
    assert.equal(col.length, 4);
  });

  it("String comparator.", function() {
    var collection = new Collection([
      {id: 3},
      {id: 1},
      {id: 2}
    ], {comparator: 'id'});
    assert.deepEqual(collection.pluck('id'), [1, 2, 3]);
  });

  it("new and parse", function() {
    var ACollection = Collection.extend({
      parse : function(data) {
        return _.filter(data, function(datum) {
          return datum.a % 2 === 0;
        });
      }
    });
    var models = [{a: 1}, {a: 2}, {a: 3}, {a: 4}];
    var collection = new ACollection(models, {parse: true});
    assert.strictEqual(collection.length, 2);
    assert.strictEqual(collection.first().get('a'), 2);
    assert.strictEqual(collection.last().get('a'), 4);
  });

  it("clone preserves model and comparator", function() {
    var AModel = Model.extend();
    var comparator = function(model){ return model.id; };

    var collection = new Collection([{id: 1}], {
      model: AModel,
      comparator: comparator
    }).clone();
    collection.add({id: 2});
    assert.ok(collection.at(0) instanceof Model);
    assert.ok(collection.at(1) instanceof Model);
    assert.strictEqual(collection.comparator, comparator);
  });

  it("get", function() {
    assert.equal(col.get(0), d);
    assert.equal(col.get(d.clone()), d);
    assert.equal(col.get(2), b);
    assert.equal(col.get({id: 1}), c);
    assert.equal(col.get(c.clone()), c);
    assert.equal(col.get(col.first().cid), col.first());
  });

  it("get with non-default ids", function() {
    var MongoModel = Model.extend({idAttribute: '_id'});
    var model = new MongoModel({_id: 100});
    var col = new Collection([model], {model: MongoModel});
    assert.equal(col.get(100), model);
    assert.equal(col.get(model.cid), model);
    assert.equal(col.get(model), model);
    assert.equal(col.get(101), void 0);

    var col2 = new Collection();
    col2.model = MongoModel;
    col2.add(model.attributes);
    assert.equal(col2.get(model.clone()), col2.first());
  });

  it('get with "undefined" id', function() {
    var collection = new Collection([{id: 1}, {id: 'undefined'}]);
    assert.equal(collection.get(1).id, 1);
  });

  it("update index when id changes", function() {
    var col = new Collection();
    col.add([
      {id : 0, name : 'one'},
      {id : 1, name : 'two'}
    ]);
    var one = col.get(0);
    assert.equal(one.get('name'), 'one');
    col.on('change:name', function (model) { assert.ok(this.get(model)); });
    one.set({name: 'dalmatians', id : 101});
    assert.equal(col.get(0), null);
    assert.equal(col.get(101).get('name'), 'dalmatians');
  });

  it("at", function() {
    assert.equal(col.at(2), c);
    assert.equal(col.at(-2), c);
  });

  it("pluck", function() {
    assert.equal(col.pluck('label').join(' '), 'a b c d');
  });

  it("add", function() {
    var added, opts, secondAdded;
    added = opts = secondAdded = null;
    e = new Model({id: 10, label : 'e'});
    otherCol.add(e);
    otherCol.on('add', function() {
      secondAdded = true;
    });
    col.on('add', function(model, collection, options){
      added = model.get('label');
      opts = options;
    });
    col.add(e, {amazing: true});
    assert.equal(added, 'e');
    assert.equal(col.length, 5);
    assert.equal(col.last(), e);
    assert.equal(otherCol.length, 1);
    assert.equal(secondAdded, null);
    assert.ok(opts.amazing);

    var f = new Model({id: 20, label : 'f'});
    var g = new Model({id: 21, label : 'g'});
    var h = new Model({id: 22, label : 'h'});
    var atCol = new Collection([f, g, h]);
    assert.equal(atCol.length, 3);
    atCol.add(e, {at: 1});
    assert.equal(atCol.length, 4);
    assert.equal(atCol.at(1), e);
    assert.equal(atCol.last(), h);

    var coll = new Collection(new Array(2));
    var addCount = 0;
    coll.on('add', function(){
        addCount += 1;
    });
    coll.add([undefined, f, g]);
    assert.equal(coll.length, 5);
    assert.equal(addCount, 3);
    coll.add(new Array(4));
    assert.equal(coll.length, 9);
    assert.equal(addCount, 7);
  });

  it("add multiple models", function() {
    var col = new Collection([{at: 0}, {at: 1}, {at: 9}]);
    col.add([{at: 2}, {at: 3}, {at: 4}, {at: 5}, {at: 6}, {at: 7}, {at: 8}], {at: 2});
    for (var i = 0; i <= 5; i++) {
      assert.equal(col.at(i).get('at'), i);
    }
  });

  it("add; at should have preference over comparator", function() {
    var Col = Collection.extend({
      comparator: function(a,b) {
        return a.id > b.id ? -1 : 1;
      }
    });

    var col = new Col([{id: 2}, {id: 3}]);
    col.add(new Model({id: 1}), {at:   1});

    assert.equal(col.pluck('id').join(' '), '3 1 2');
  });

  it("can't add model to collection twice", function() {
    var col = new Collection([{id: 1}, {id: 2}, {id: 1}, {id: 2}, {id: 3}]);
    assert.equal(col.pluck('id').join(' '), '1 2 3');
  });

  it("can't add different model with same id to collection twice", function() {
    var col = new Collection();
    col.unshift({id: 101});
    col.add({id: 101});
    assert.equal(col.length, 1);
  });

  it("merge in duplicate models with {merge: true}", function() {
    var col = new Collection();
    col.add([{id: 1, name: 'Moe'}, {id: 2, name: 'Curly'}, {id: 3, name: 'Larry'}]);
    col.add({id: 1, name: 'Moses'});
    assert.equal(col.first().get('name'), 'Moe');
    col.add({id: 1, name: 'Moses'}, {merge: true});
    assert.equal(col.first().get('name'), 'Moses');
    col.add({id: 1, name: 'Tim'}, {merge: true, silent: true});
    assert.equal(col.first().get('name'), 'Tim');
  });

  it("add model to multiple collections", function() {
    var counter = 0;
    var e = new Model({id: 10, label : 'e'});
    e.on('add', function(model, collection) {
      counter++;
      assert.equal(e, model);
      if (counter > 1) {
        assert.equal(collection, colF);
      } else {
        assert.equal(collection, colE);
      }
    });
    var colE = new Collection([]);
    colE.on('add', function(model, collection) {
      assert.equal(e, model);
      assert.equal(colE, collection);
    });
    var colF = new Collection([]);
    colF.on('add', function(model, collection) {
      assert.equal(e, model);
      assert.equal(colF, collection);
    });
    colE.add(e);
    assert.equal(e.collection, colE);
    colF.add(e);
    assert.equal(e.collection, colE);
  });

  it("add model with parse", function() {
    var AModel = Model.extend({
      parse: function(obj) {
        obj.value += 1;
        return obj;
      }
    });

    var Col = Collection.extend({model: AModel});
    var col = new Col;
    col.add({value: 1}, {parse: true});
    assert.equal(col.at(0).get('value'), 2);
  });

  it("add with parse and merge", function() {
    var collection = new Collection();
    collection.parse = function(attrs) {
      return _.map(attrs, function(model) {
        if (model.model) return model.model;
        return model;
      });
    };
    collection.add({id: 1});
    collection.add({model: {id: 1, name: 'Alf'}}, {parse: true, merge: true});
    assert.equal(collection.first().get('name'), 'Alf');
  });

  it("add model to collection with sort()-style comparator", function() {
    var col = new Collection();
    col.comparator = function(a, b) {
      return a.get('name') < b.get('name') ? -1 : 1;
    };
    var tom = new Model({name: 'Tom'});
    var rob = new Model({name: 'Rob'});
    var tim = new Model({name: 'Tim'});
    col.add(tom);
    col.add(rob);
    col.add(tim);
    assert.equal(col.indexOf(rob), 0);
    assert.equal(col.indexOf(tim), 1);
    assert.equal(col.indexOf(tom), 2);
  });

  it("comparator that depends on `this`", function() {
    var col = new Collection();
    col.negative = function(num) {
      return -num;
    };
    col.comparator = function(a) {
      return this.negative(a.id);
    };
    col.add([{id: 1}, {id: 2}, {id: 3}]);
    assert.deepEqual(col.pluck('id'), [3, 2, 1]);
    col.comparator = function(a, b) {
      return this.negative(b.id) - this.negative(a.id);
    };
    col.sort();
    assert.deepEqual(col.pluck('id'), [1, 2, 3]);
  });

  it("remove", function() {
    var removed = null;
    var otherRemoved = null;
    var result = null;
    col.on('remove', function(model, col, options) {
      removed = model.get('label');
      assert.equal(options.index, 3);
    });
    otherCol.on('remove', function(model, col, options) {
      otherRemoved = true;
    });
    result = col.remove(d);
    assert.equal(removed, 'd');
    assert.strictEqual(result, d);
    //if we try to remove d again, it's not going to actually get removed
    result = col.remove(d);
    assert.strictEqual(result, undefined);
    assert.equal(col.length, 3);
    assert.equal(col.first(), a);
    assert.equal(otherRemoved, null);
  });

  it("add and remove return values", function() {
    var Even = Model.extend({
      validate: function(attrs) {
        if (attrs.id % 2 !== 0) return "odd";
      }
    });
    var col = new Collection();
    col.model = Even;

    var list = col.add([{id: 2}, {id: 4}], {validate: true});
    assert.equal(list.length, 2);
    assert.ok(list[0] instanceof Model);
    assert.equal(list[1], col.last());
    assert.equal(list[1].get('id'), 4);

    list = col.add([{id: 3}, {id: 6}], {validate: true});
    assert.equal(col.length, 3);
    assert.equal(list[0], false);
    assert.equal(list[1].get('id'), 6);

    var result = col.add({id: 6});
    assert.equal(result.cid, list[1].cid);

    result = col.remove({id: 6});
    assert.equal(col.length, 2);
    assert.equal(result.id, 6);

    list = col.remove([{id: 2}, {id: 8}]);
    assert.equal(col.length, 1);
    assert.equal(list[0].get('id'), 2);
    assert.equal(list[1], null);
  });

  it("shift and pop", function() {
    var col = new Collection([{a: 'a'}, {b: 'b'}, {c: 'c'}]);
    assert.equal(col.shift().get('a'), 'a');
    assert.equal(col.pop().get('c'), 'c');
  });

  it("slice", function() {
    var col = new Collection([{a: 'a'}, {b: 'b'}, {c: 'c'}]);
    var array = col.slice(1, 3);
    assert.equal(array.length, 2);
    assert.equal(array[0].get('b'), 'b');
  });

  it("events are unbound on remove", function() {
    var counter = 0;
    var dj = new Model();
    var emcees = new Collection([dj]);
    emcees.on('change', function(){ counter++; });
    dj.set({name : 'Kool'});
    assert.equal(counter, 1);
    emcees.reset([]);
    assert.equal(dj.collection, undefined);
    dj.set({name : 'Shadow'});
    assert.equal(counter, 1);
  });

  it("remove in multiple collections", function() {
    var modelData = {
      id : 5,
      title : 'Othello'
    };
    var passed = false;
    var e = new Model(modelData);
    var f = new Model(modelData);
    f.on('remove', function() {
      passed = true;
    });
    var colE = new Collection([e]);
    var colF = new Collection([f]);
    assert.ok(e != f);
    assert.ok(colE.length === 1);
    assert.ok(colF.length === 1);
    colE.remove(e);
    assert.equal(passed, false);
    assert.ok(colE.length === 0);
    colF.remove(e);
    assert.ok(colF.length === 0);
    assert.equal(passed, true);
  });

  it("remove same model in multiple collection", function() {
    var counter = 0;
    var e = new Model({id: 5, title: 'Othello'});
    e.on('remove', function(model, collection) {
      counter++;
      assert.equal(e, model);
      if (counter > 1) {
        assert.equal(collection, colE);
      } else {
        assert.equal(collection, colF);
      }
    });
    var colE = new Collection([e]);
    colE.on('remove', function(model, collection) {
      assert.equal(e, model);
      assert.equal(colE, collection);
    });
    var colF = new Collection([e]);
    colF.on('remove', function(model, collection) {
      assert.equal(e, model);
      assert.equal(colF, collection);
    });
    assert.equal(colE, e.collection);
    colF.remove(e);
    assert.ok(colF.length === 0);
    assert.ok(colE.length === 1);
    assert.equal(counter, 1);
    assert.equal(colE, e.collection);
    colE.remove(e);
    assert.equal(null, e.collection);
    assert.ok(colE.length === 0);
    assert.equal(counter, 2);
  });

  it("model destroy removes from all collections", function() {
    var e = new Model({id: 5, title: 'Othello'});
    e.sync = function(method, model, options) { options.success(); };
    var colE = new Collection([e]);
    var colF = new Collection([e]);
    e.destroy();
    assert.ok(colE.length === 0);
    assert.ok(colF.length === 0);
    assert.equal(undefined, e.collection);
  });

  it("Colllection: non-persisted model destroy removes from all collections", function() {
    var e = new Model({title: 'Othello'});
    e.sync = function(method, model, options) { throw "should not be called"; };
    var colE = new Collection([e]);
    var colF = new Collection([e]);
    e.destroy();
    assert.ok(colE.length === 0);
    assert.ok(colF.length === 0);
    assert.equal(undefined, e.collection);
  });

  it("fetch", function() {
    var collection = new Collection;
    collection.url = '/';
    collection.fetch();
    assert.equal(this.syncArgs.method, 'read');
    assert.equal(this.syncArgs.model, collection);
    assert.equal(this.syncArgs.options.parse, true);

    collection.fetch({parse: false});
    assert.equal(this.syncArgs.options.parse, false);
  });

  it("fetch with an error response triggers an error event", function () {
    var collection = new Collection();
    collection.on('error', function () {
      assert.ok(true);
    });
    collection.sync = function (method, model, options) { options.error(); };
    collection.fetch();
  });

  it("should fix jashkenas/backbone#3283 - fetch with an error response calls error with context", function () {
    var collection = new Collection();
    var obj = {};
    var options = {
      context: obj,
      error: function() {
        assert.equal(this, obj);
      }
    };
    collection.sync = function (method, model, options) {
      options.error.call(options.context);
    };
    collection.fetch(options);
  });

  it("ensure fetch only parses once", function() {
    var collection = new Collection;
    var counter = 0;
    collection.parse = function(models) {
      counter++;
      return models;
    };
    collection.url = '/';
    collection.fetch();
    this.syncArgs.options.success();
    assert.equal(counter, 1);
  });

  it("create", function() {
    var collection = new Collection;
    collection.url = '/test';
    var model = collection.create({label: 'f'}, {wait: true});
    assert.equal(this.syncArgs.method, 'create');
    assert.equal(this.syncArgs.model, model);
    assert.equal(model.get('label'), 'f');
    assert.equal(model.collection, collection);
  });

  it("create with validate:true enforces validation", function() {
    var ValidatingModel = Model.extend({
      validate: function(attrs) {
        return "fail";
      }
    });
    var ValidatingCollection = Collection.extend({
      model: ValidatingModel
    });
    var col = new ValidatingCollection();
    col.on('invalid', function (collection, error, options) {
      assert.equal(error, "fail");
      assert.equal(options.validationError, 'fail');
    });
    assert.equal(col.create({"foo":"bar"}, {validate:true}), false);
  });

  it("create will pass extra options to success callback", function () {
    var AModel = Model.extend({
      sync: function (method, model, options) {
        _.extend(options, {specialSync: true});
        return Model.prototype.sync.call(this, method, model, options);
      }
    });

    var ACollection = Collection.extend({
      model: AModel,
      url: '/test'
    });

    var collection = new ACollection();

    var success = function (model, response, options) {
      assert.ok(options.specialSync, "Options were passed correctly to callback");
    };

    collection.create({}, {success: success});
    this.ajaxSettings.success();

  });

  it("a failing create returns model with errors", function() {
    var ValidatingModel = Model.extend({
      validate: function(attrs) {
        return "fail";
      }
    });
    var ValidatingCollection = Collection.extend({
      model: ValidatingModel
    });
    var col = new ValidatingCollection();
    var m = col.create({"foo":"bar"});
    assert.equal(m.validationError, 'fail');
    assert.equal(col.length, 1);
  });

  it("initialize", function() {
    var ACollection = Collection.extend({
      initialize: function() {
        this.one = 1;
      }
    });
    var coll = new ACollection();
    assert.equal(coll.one, 1);
  });

  it("toJSON", function() {
    assert.equal(JSON.stringify(col), '[{"id":3,"label":"a"},{"id":2,"label":"b"},{"id":1,"label":"c"},{"id":0,"label":"d"}]');
  });

  it("where and findWhere", function() {
    var model = new Model({a: 1});
    var coll = new Collection([
      model,
      {a: 1},
      {a: 1, b: 2},
      {a: 2, b: 2},
      {a: 3}
    ]);
    assert.equal(coll.where({a: 1}).length, 3);
    assert.equal(coll.where({a: 2}).length, 1);
    assert.equal(coll.where({a: 3}).length, 1);
    assert.equal(coll.where({b: 1}).length, 0);
    assert.equal(coll.where({b: 2}).length, 2);
    assert.equal(coll.where({a: 1, b: 2}).length, 1);
    assert.equal(coll.findWhere({a: 1}), model);
    assert.equal(coll.findWhere({a: 4}), void 0);
  });

  it("Underscore methods", function() {
    assert.equal(col.map(function(model){ return model.get('label'); }).join(' '), 'a b c d');
    assert.equal(col.any(function(model){ return model.id === 100; }), false);
    assert.equal(col.any(function(model){ return model.id === 0; }), true);
    assert.equal(col.indexOf(b), 1);
    assert.equal(col.size(), 4);
    assert.equal(col.rest().length, 3);
    assert.ok(!_.include(col.rest(), a));
    assert.ok(_.include(col.rest(), d));
    assert.ok(!col.isEmpty());
    assert.ok(!_.include(col.without(d), d));
    assert.equal(col.max(function(model){ return model.id; }).id, 3);
    assert.equal(col.min(function(model){ return model.id; }).id, 0);
    assert.deepEqual(col.chain()
            .filter(function(o){ return o.id % 2 === 0; })
            .map(function(o){ return o.id * 2; })
            .value(),
         [4, 0]);
    assert.deepEqual(col.difference([c, d]), [a, b]);
    assert.ok(col.include(col.sample()));
    var first = col.first();
    assert.ok(col.indexBy('id')[first.id] === first);
  });

  it("reset", function() {
    var resetCount = 0;
    var models = col.models;
    col.on('reset', function() { resetCount += 1; });
    col.reset([]);
    assert.equal(resetCount, 1);
    assert.equal(col.length, 0);
    assert.equal(col.last(), null);
    col.reset(models);
    assert.equal(resetCount, 2);
    assert.equal(col.length, 4);
    assert.equal(col.last(), d);
    col.reset(_.map(models, function(m){ return m.attributes; }));
    assert.equal(resetCount, 3);
    assert.equal(col.length, 4);
    assert.ok(col.last() !== d);
    assert.ok(_.isEqual(col.last().attributes, d.attributes));
    col.reset();
    assert.equal(col.length, 0);
    assert.equal(resetCount, 4);

    var f = new Model({id: 20, label : 'f'});
    col.reset([undefined, f]);
    assert.equal(col.length, 2);
    assert.equal(resetCount, 5);

    col.reset(new Array(4));
    assert.equal(col.length, 4);
    assert.equal(resetCount, 6);
  });

  it("reset with different values", function(){
    var col = new Collection({id: 1});
    col.reset({id: 1, a: 1});
    assert.equal(col.get(1).get('a'), 1);
  });

  it("same references in reset", function() {
    var model = new Model({id: 1});
    var collection = new Collection({id: 1});
    collection.reset(model);
    assert.equal(collection.get(1), model);
  });

  it("reset passes caller options", function() {
    var AModel = Model.extend({
      initialize: function(attrs, options) {
        this.model_parameter = options.model_parameter;
      }
    });
    var col = new (Collection.extend({ model: AModel }))();
    col.reset([{ astring: "green", anumber: 1 }, { astring: "blue", anumber: 2 }], { model_parameter: 'model parameter' });
    assert.equal(col.length, 2);
    col.each(function(model) {
      assert.equal(model.model_parameter, 'model parameter');
    });
  });

  it("reset does not alter options by reference", function() {
    var col = new Collection([{id:1}]);
    var origOpts = {};
    col.on("reset", function(col, opts){
      assert.equal(origOpts.previousModels, undefined);
      assert.equal(opts.previousModels[0].id, 1);
    });
    col.reset([], origOpts);
  });

  it("trigger custom events on models", function() {
    var fired = null;
    a.on("custom", function() { fired = true; });
    a.trigger("custom");
    assert.equal(fired, true);
  });

  it("add does not alter arguments", function(){
    var attrs = {};
    var models = [attrs];
    new Collection().add(models);
    assert.equal(models.length, 1);
    assert.ok(attrs === models[0]);
  });

  it("should fix jashkenas/backbone#714: access `model.collection` in a brand new model.", function() {
    var collection = new Collection;
    collection.url = '/test';
    var AModel = Model.extend({
      set: function(attrs) {
        assert.equal(attrs.prop, 'value');
        assert.equal(this.collection, collection);
        return this;
      }
    });
    collection.model = AModel;
    collection.create({prop: 'value'});
  });

  it("should fix jashkenas/backbone#574, remove its own reference to the .models array.", function() {
    var col = new Collection([
      {id: 1}, {id: 2}, {id: 3}, {id: 4}, {id: 5}, {id: 6}
    ]);
    assert.equal(col.length, 6);
    col.remove(col.models);
    assert.equal(col.length, 0);
  });

  it("should fix jashkenas/backbone#861, adding models to a collection which do not pass validation, with validate:true", function() {
    var AModel = Model.extend({
      validate: function(attrs) {
        if (attrs.id == 3) return "id can't be 3";
      }
    });

    var ACollection = Collection.extend({
      model: AModel
    });

    var collection = new ACollection();
    collection.on("invalid", function() { assert.ok(true); });

    collection.add([{id: 1}, {id: 2}, {id: 3}, {id: 4}, {id: 5}, {id: 6}], {validate:true});
    assert.deepEqual(collection.pluck("id"), [1, 2, 4, 5, 6]);
  });

  it("Invalid models are discarded with validate:true.", function() {
    var collection = new Collection();
    collection.on('test', function() { assert.ok(true); });
    collection.model = Model.extend({
      validate: function(attrs){ if (!attrs.valid) return 'invalid'; }
    });
    var model = new collection.model({id: 1, valid: true});
    collection.add([model, {id: 2}], {validate:true});
    model.trigger('test');
    assert.ok(collection.get(model.cid));
    assert.ok(collection.get(1));
    assert.ok(!collection.get(2));
    assert.equal(collection.length, 1);
  });

  it("multiple copies of the same model", function() {
    var col = new Collection();
    var model = new Model();
    col.add([model, model]);
    assert.equal(col.length, 1);
    col.add([{id: 1}, {id: 1}]);
    assert.equal(col.length, 2);
    assert.equal(col.last().id, 1);
  });

  it("should fix jashkenas/backbone#964 - collection.get return inconsistent", function() {
    var c = new Collection();
    assert.ok(c.get(null) === undefined);
    assert.ok(c.get() === undefined);
  });

  it("should fix jashkenas/backbone#1112 - passing options.model sets collection.model", function() {
    var AModel = Model.extend({});
    var c = new Collection([{id: 1}], {model: AModel});
    assert.ok(c.model === AModel);
    assert.ok(c.at(0) instanceof AModel);
  });

  it("null and undefined are invalid ids.", function() {
    var model = new Model({id: 1});
    var collection = new Collection([model]);
    model.set({id: null});
    assert.ok(!collection.get('null'));
    model.set({id: 1});
    model.set({id: undefined});
    assert.ok(!collection.get('undefined'));
  });

  it("falsy comparator", function(){
    var Col = Collection.extend({
      comparator: function(model){ return model.id; }
    });
    var col = new Col();
    var colFalse = new Col(null, {comparator: false});
    var colNull = new Col(null, {comparator: null});
    var colUndefined = new Col(null, {comparator: undefined});
    assert.ok(col.comparator);
    assert.ok(!colFalse.comparator);
    assert.ok(!colNull.comparator);
    assert.ok(colUndefined.comparator);
  });

  it("should fix jashkenas/backbone#1355 - `options` is passed to success callbacks", function(){
    var m = new Model({x:1});
    var col = new Collection();
    var opts = {
      opts: true,
      success: function(collection, resp, options) {
        assert.ok(options.opts);
      }
    };
    col.sync = m.sync = function( method, collection, options ){
      options.success({});
    };
    col.fetch(opts);
    col.create(m, opts);
  });

  it("should fix jashkenas/backbone#1412 - Trigger 'request' and 'sync' events.", function() {
    var collection = new Collection();
    collection.url = '/test';
    
    var ajax = browserModels.getAjax();
    browserModels.setAjax(function(settings){ settings.success(); });

    collection.on('request', function(obj, xhr, options) {
      assert.ok(obj === collection, "collection has correct 'request' event after fetching");
    });
    collection.on('sync', function(obj, response, options) {
      assert.ok(obj === collection, "collection has correct 'sync' event after fetching");
    });
    collection.fetch();
    collection.off();

    collection.on('request', function(obj, xhr, options) {
      assert.ok(obj === collection.get(1), "collection has correct 'request' event after one of its models save");
    });
    collection.on('sync', function(obj, response, options) {
      assert.ok(obj === collection.get(1), "collection has correct 'sync' event after one of its models save");
    });
    collection.create({id: 1});
    collection.off();
    browserModels.setAjax(ajax);
  });

  it("should fix jashkenas/backbone#3283 - fetch, create calls success with context", function() {
    var collection = new Collection;
    collection.url = '/test';
    var ajax = browserModels.getAjax();
    browserModels.setAjax(function(settings) {
      settings.success.call(settings.context);
    });
    var obj = {};
    var options = {
      context: obj,
      success: function() {
        assert.equal(this, obj);
      }
    };

    collection.fetch(options);
    collection.create({id: 1}, options);
    browserModels.setAjax(ajax);
  });

  it("should fix jashkenas/backbone#1447 - create with wait adds model.", function() {
    var collection = new Collection;
    var model = new Model;
    model.sync = function(method, model, options){ options.success(); };
    collection.on('add', function(){ assert.ok(true); });
    collection.create(model, {wait: true});
  });

  it("should fix jashkenas/backbone#1448 - add sorts collection after merge.", function() {
    var collection = new Collection([
      {id: 1, x: 1},
      {id: 2, x: 2}
    ]);
    collection.comparator = function(model){ return model.get('x'); };
    collection.add({id: 1, x: 3}, {merge: true});
    assert.deepEqual(collection.pluck('id'), [2, 1]);
  });

  it("should fix jashkenas/backbone#1655 - groupBy can be used with a string argument.", function() {
    var collection = new Collection([{x: 1}, {x: 2}]);
    var grouped = collection.groupBy('x');
    assert.strictEqual(_.keys(grouped).length, 2);
    assert.strictEqual(grouped[1][0].get('x'), 1);
    assert.strictEqual(grouped[2][0].get('x'), 2);
  });

  it("should fix jashkenas/backbone#1655 - sortBy can be used with a string argument.", function() {
    var collection = new Collection([{x: 3}, {x: 1}, {x: 2}]);
    var values = _.map(collection.sortBy('x'), function(model) {
      return model.get('x');
    });
    assert.deepEqual(values, [1, 2, 3]);
  });

  it("should fix jashkenas/backbone#1604 - Removal during iteration.", function() {
    var collection = new Collection([{}, {}]);
    collection.on('add', function() {
      collection.at(0).destroy();
    });
    collection.add({}, {at: 0});
  });

  it("should fix jashkenas/backbone#1638 - `sort` during `add` triggers correctly.", function() {
    var collection = new Collection;
    collection.comparator = function(model) { return model.get('x'); };
    var added = [];
    collection.on('add', function(model) {
      model.set({x: 3});
      collection.sort();
      added.push(model.id);
    });
    collection.add([{id: 1, x: 1}, {id: 2, x: 2}]);
    assert.deepEqual(added, [1, 2]);
  });

  it("fetch parses models by default", function() {
    var model = {};
    var ACollection = Collection.extend({
      url: 'test',
      model: Model.extend({
        parse: function(resp) {
          assert.strictEqual(resp, model);
        }
      })
    });
    new ACollection().fetch();
    this.ajaxSettings.success([model]);
  });

  it("`sort` shouldn't always fire on `add`", function() {
    var c = new Collection([{id: 1}, {id: 2}, {id: 3}], {
      comparator: 'id'
    });
    c.sort = function(){ assert.ok(true); };
    c.add([]);
    c.add({id: 1});
    c.add([{id: 2}, {id: 3}]);
    c.add({id: 4});
  });

  it("should fix jashkenas/backbone#1407 parse option on constructor parses collection and models", function() {
    var model = {
      namespace : [{id: 1}, {id:2}]
    };
    var ACollection = Collection.extend({
      model: Model.extend({
        parse: function(model) {
          model.name = 'test';
          return model;
        }
      }),
      parse: function(model) {
        return model.namespace;
      }
    });
    var c = new ACollection(model, {parse:true});

    assert.equal(c.length, 2);
    assert.equal(c.at(0).get('name'), 'test');
  });

  it("should fix jashkenas/backbone#1407 parse option on reset parses collection and models", function() {
    var model = {
      namespace : [{id: 1}, {id:2}]
    };
    var ACollection = Collection.extend({
      model: Model.extend({
        parse: function(model) {
          model.name = 'test';
          return model;
        }
      }),
      parse: function(model) {
        return model.namespace;
      }
    });
    var c = new ACollection();
        c.reset(model, {parse:true});

    assert.equal(c.length, 2);
    assert.equal(c.at(0).get('name'), 'test');
  });


  it("Reset includes previous models in triggered event.", function() {
    var model = new Model();
    var collection = new Collection([model])
    .on('reset', function(collection, options) {
      assert.deepEqual(options.previousModels, [model]);
    });
    collection.reset([]);
  });

  it("set", function() {
    var m1 = new Model();
    var m2 = new Model({id: 2});
    var m3 = new Model();
    var c = new Collection([m1, m2]);

    // Test add/change/remove events
    c.on('add', function(model) {
      assert.strictEqual(model, m3);
    });
    c.on('change', function(model) {
      assert.strictEqual(model, m2);
    });
    c.on('remove', function(model) {
      assert.strictEqual(model, m1);
    });

    // remove: false doesn't remove any models
    c.set([], {remove: false});
    assert.strictEqual(c.length, 2);

    // add: false doesn't add any models
    c.set([m1, m2, m3], {add: false});
    assert.strictEqual(c.length, 2);

    // merge: false doesn't change any models
    c.set([m1, {id: 2, a: 1}], {merge: false});
    assert.strictEqual(m2.get('a'), void 0);

    // add: false, remove: false only merges existing models
    c.set([m1, {id: 2, a: 0}, m3, {id: 4}], {add: false, remove: false});
    assert.strictEqual(c.length, 2);
    assert.strictEqual(m2.get('a'), 0);

    // default options add/remove/merge as appropriate
    c.set([{id: 2, a: 1}, m3]);
    assert.strictEqual(c.length, 2);
    assert.strictEqual(m2.get('a'), 1);

    // Test removing models not passing an argument
    c.off('remove').on('remove', function(model) {
      assert.ok(model === m2 || model === m3);
    });
    c.set([]);
    assert.strictEqual(c.length, 0);
  });

  it("set with only cids", function() {
    var m1 = new Model;
    var m2 = new Model;
    var c = new Collection;
    c.set([m1, m2]);
    assert.equal(c.length, 2);
    c.set([m1]);
    assert.equal(c.length, 1);
    c.set([m1, m1, m1, m2, m2], {remove: false});
    assert.equal(c.length, 2);
  });

  it("set with only idAttribute", function() {
    var m1 = { _id: 1 };
    var m2 = { _id: 2 };
    var col = Collection.extend({
      model: Model.extend({
        idAttribute: '_id'
      })
    });
    var c = new col;
    c.set([m1, m2]);
    assert.equal(c.length, 2);
    c.set([m1]);
    assert.equal(c.length, 1);
    c.set([m1, m1, m1, m2, m2], {remove: false});
    assert.equal(c.length, 2);
  });

  it("set + merge with default values defined", function() {
    var AModel = Model.extend({
      defaults: {
        key: 'value'
      }
    });
    var m = new AModel({id: 1});
    var col = new Collection([m], {model: AModel});
    assert.equal(col.first().get('key'), 'value');

    col.set({id: 1, key: 'other'});
    assert.equal(col.first().get('key'), 'other');

    col.set({id: 1, other: 'value'});
    assert.equal(col.first().get('key'), 'other');
    assert.equal(col.length, 1);
  });

  it('merge without mutation', function () {
    var AModel = Model.extend({
      initialize: function (attrs, options) {
        if (attrs.child) {
          this.set('child', new Model(attrs.child, options), options);
        }
      }
    });
    var ACollection = Collection.extend({model: AModel});
    var data = [{id: 1, child: {id: 2}}];
    var collection = new ACollection(data);
    assert.equal(collection.first().id, 1);
    collection.set(data);
    assert.equal(collection.first().id, 1);
    collection.set([{id: 2, child: {id: 2}}].concat(data));
    assert.deepEqual(collection.pluck('id'), [2, 1]);
  });

  it("`set` and model level `parse`", function() {
    var AModel = Model.extend({});
    var ACollection = Collection.extend({
      model: AModel,
      parse: function (res) { return _.pluck(res.models, 'model'); }
    });
    var model = new AModel({id: 1});
    var collection = new ACollection(model);
    collection.set({models: [
      {model: {id: 1}},
      {model: {id: 2}}
    ]}, {parse: true});
    assert.equal(collection.first(), model);
  });

  it("`set` data is only parsed once", function() {
    var collection = new Collection();
    collection.model = Model.extend({
      parse: function (data) {
        assert.equal(data.parsed, void 0);
        data.parsed = true;
        return data;
      }
    });
    collection.set({}, {parse: true});
  });

  it('`set` matches input order in the absence of a comparator', function () {
    var one = new Model({id: 1});
    var two = new Model({id: 2});
    var three = new Model({id: 3});
    var collection = new Collection([one, two, three]);
    collection.set([{id: 3}, {id: 2}, {id: 1}]);
    assert.deepEqual(collection.models, [three, two, one]);
    collection.set([{id: 1}, {id: 2}]);
    assert.deepEqual(collection.models, [one, two]);
    collection.set([two, three, one]);
    assert.deepEqual(collection.models, [two, three, one]);
    collection.set([{id: 1}, {id: 2}], {remove: false});
    assert.deepEqual(collection.models, [two, three, one]);
    collection.set([{id: 1}, {id: 2}, {id: 3}], {merge: false});
    assert.deepEqual(collection.models, [one, two, three]);
    collection.set([three, two, one, {id: 4}], {add: false});
    assert.deepEqual(collection.models, [one, two, three]);
  });

  it("should fix jashkenas/backbone#1894 - Push should not trigger a sort", function() {
    var ACollection = Collection.extend({
      comparator: 'id',
      sort: function() { throw new Error("This should not be called"); }
    });
    new ACollection().push({id: 1});
  });

  it("should fix jashkenas/backbone#2428 - push duplicate models, return the correct one", function() {
    var col = new Collection();
    var model1 = col.push({id: 101});
    var model2 = col.push({id: 101})
    assert.ok(model2.cid == model1.cid);
  });

  it("`set` with non-normal id", function() {
    var ACollection = Collection.extend({
      model: Model.extend({idAttribute: '_id'})
    });
    var collection = new ACollection({_id: 1});
    collection.set([{_id: 1, a: 1}], {add: false});
    assert.equal(collection.first().get('a'), 1);
  });

  it("should fix jashkenas/backbone#1894 - `sort` can optionally be turned off", function() {
    var ACollection = Collection.extend({
      comparator: 'id',
      sort: function() { throw new Error("This should not be called"); }
    });
    new ACollection().add({id: 1}, {sort: false});
  });

  it("should fix jashkenas/backbone#1915 - `parse` data in the right order in `set`", function() {
    var collection = new (Collection.extend({
      parse: function (data) {
        assert.strictEqual(data.status, 'assert.ok');
        return data.data;
      }
    }));
    var res = {status: 'assert.ok', data:[{id: 1}]};
    collection.set(res, {parse: true});
  });

  it("should fix jashkenas/backbone#1939 - `parse` is passed `options`", function (done) {
    var collection = new (Collection.extend({
      url: '/',
      parse: function (data, options) {
        assert.strictEqual(options.xhr.someHeader, 'headerValue');
        return data;
      }
    }));
    var ajax = browserModels.getAjax();
    browserModels.setAjax(function (params) {
      _.defer(params.success);
      return {someHeader: 'headerValue'};
    });
    collection.fetch({
      success: function () { done(); }
    });
    browserModels.setAjax(ajax);
  });

  it("fetch will pass extra options to success callback", function () {
    var SpecialSyncCollection = Collection.extend({
      url: '/test',
      sync: function (method, collection, options) {
        _.extend(options, { specialSync: true });
        return Collection.prototype.sync.call(this, method, collection, options);
      }
    });

    var collection = new SpecialSyncCollection();

    var onSuccess = function (collection, resp, options) {
      assert.ok(options.specialSync, "Options were passed correctly to callback");
    };

    collection.fetch({ success: onSuccess });
    this.ajaxSettings.success();
  });

  it("`add` only `sort`s when necessary", function () {
    var collection = new (Collection.extend({
      comparator: 'a'
    }))([{id: 1}, {id: 2}, {id: 3}]);
    collection.on('sort', function () { assert.ok(true); });
    collection.add({id: 4}); // do sort, new model
    collection.add({id: 1, a: 1}, {merge: true}); // do sort, comparator change
    collection.add({id: 1, b: 1}, {merge: true}); // don't sort, no comparator change
    collection.add({id: 1, a: 1}, {merge: true}); // don't sort, no comparator change
    collection.add(collection.models); // don't sort, nothing new
    collection.add(collection.models, {merge: true}); // don't sort
  });

  it("`add` only `sort`s when necessary with comparator function", function () {
    var collection = new (Collection.extend({
      comparator: function(a, b) {
        return a.get('a') > b.get('a') ? 1 : (a.get('a') < b.get('a') ? -1 : 0);
      }
    }))([{id: 1}, {id: 2}, {id: 3}]);
    collection.on('sort', function () { assert.ok(true); });
    collection.add({id: 4}); // do sort, new model
    collection.add({id: 1, a: 1}, {merge: true}); // do sort, model change
    collection.add({id: 1, b: 1}, {merge: true}); // do sort, model change
    collection.add({id: 1, a: 1}, {merge: true}); // don't sort, no model change
    collection.add(collection.models); // don't sort, nothing new
    collection.add(collection.models, {merge: true}); // don't sort
  });

  it("Attach options to collection.", function() {
    var comparator = function(){};

    var collection = new Collection([], {
      model: Model,
      comparator: comparator
    });

    assert.ok(collection.model === Model);
    assert.ok(collection.comparator === comparator);
  });

  it("`add` overrides `set` flags", function () {
    var collection = new Collection();
    collection.once('add', function (model, collection, options) {
      collection.add({id: 2}, options);
    });
    collection.set({id: 1});
    assert.equal(collection.length, 2);
  });

  it("should fix jashkenas/backbone#2606 - Collection#create, success arguments", function() {
    var collection = new Collection;
    collection.url = 'test';
    collection.create({}, {
      success: function(model, resp, options) {
        assert.strictEqual(resp, 'response');
      }
    });
    this.ajaxSettings.success('response');
  });

  it("should fix jashkenas/backbone#2612 - nested `parse` works with `Collection#set`", function() {

    var Job = Model.extend({
      constructor: function() {
        this.items = new Items();
        Model.apply(this, arguments);
      },
      parse: function(attrs) {
        this.items.set(attrs.items, {parse: true});
        return _.omit(attrs, 'items');
      }
    });

    var Item = Model.extend({
      constructor: function() {
        this.subItems = new Collection();
        Model.apply(this, arguments);
      },
      parse: function(attrs) {
        this.subItems.set(attrs.subItems, {parse: true});
        return _.omit(attrs, 'subItems');
      }
    });

    var Items = Collection.extend({
      model: Item
    });

    var data = {
      name: 'JobName',
      id: 1,
      items: [{
        id: 1,
        name: 'Sub1',
        subItems: [
          {id: 1, subName: 'One'},
          {id: 2, subName: 'Two'}
        ]
      }, {
        id: 2,
        name: 'Sub2',
        subItems: [
          {id: 3, subName: 'Three'},
          {id: 4, subName: 'Four'}
        ]
      }]
    };

    var newData = {
      name: 'NewJobName',
      id: 1,
      items: [{
        id: 1,
        name: 'NewSub1',
        subItems: [
          {id: 1,subName: 'NewOne'},
          {id: 2,subName: 'NewTwo'}
        ]
      }, {
        id: 2,
        name: 'NewSub2',
        subItems: [
          {id: 3,subName: 'NewThree'},
          {id: 4,subName: 'NewFour'}
        ]
      }]
    };

    var job = new Job(data, {parse: true});
    assert.equal(job.get('name'), 'JobName');
    assert.equal(job.items.at(0).get('name'), 'Sub1');
    assert.equal(job.items.length, 2);
    assert.equal(job.items.get(1).subItems.get(1).get('subName'), 'One');
    assert.equal(job.items.get(2).subItems.get(3).get('subName'), 'Three');
    job.set(job.parse(newData, {parse: true}));
    assert.equal(job.get('name'), 'NewJobName');
    assert.equal(job.items.at(0).get('name'), 'NewSub1');
    assert.equal(job.items.length, 2);
    assert.equal(job.items.get(1).subItems.get(1).get('subName'), 'NewOne');
    assert.equal(job.items.get(2).subItems.get(3).get('subName'), 'NewThree');
  });

  it('_addReference binds all collection events & adds to the lookup hashes', function() {

    var calls = {add: 0, remove: 0};

    var ACollection = Collection.extend({

      _addReference: function(model) {
        Collection.prototype._addReference.apply(this, arguments);
        calls.add++;
        assert.equal(model, this._byId[model.id]);
        assert.equal(model, this._byId[model.cid]);
        assert.equal(model._events.all.length, 1);
      },

      _removeReference: function(model) {
        Collection.prototype._removeReference.apply(this, arguments);
        calls.remove++;
        assert.equal(this._byId[model.id], void 0);
        assert.equal(this._byId[model.cid], void 0);
        assert.equal(model.collection, void 0);
        assert.equal(model._events, void 0);
      }

    });

    var collection = new ACollection();
    var model = collection.add({id: 1});
    collection.remove(model);

    assert.equal(calls.add, 1);
    assert.equal(calls.remove, 1);

  });

  it('Do not allow duplicate models to be `add`ed or `set`', function() {
    var c = new Collection();

    c.add([{id: 1}, {id: 1}]);
    assert.equal(c.length, 1);
    assert.equal(c.models.length, 1);

    c.set([{id: 1}, {id: 1}]);
    assert.equal(c.length, 1);
    assert.equal(c.models.length, 1);
  });

  it('#3020: #set with {add: false} should not throw.', function() {
    var collection = new Collection;
    collection.set([{id: 1}], {add: false});
    assert.strictEqual(collection.length, 0);
    assert.strictEqual(collection.models.length, 0);
  });

  it("create with wait, model instance, #3028", function() {
    var collection = new Collection();
    var model = new Model({id: 1});
    model.sync = function(){
      assert.equal(this.collection, collection);
    };
    collection.create(model, {wait: true});
  });

  it("modelId", function() {
    var Stooge = Model.extend();
    var StoogeCollection = Collection.extend({model: Stooge});

    // Default to using `Collection::model::idAttribute`.
    assert.equal(StoogeCollection.prototype.modelId({id: 1}), 1);
    Stooge.prototype.idAttribute = '_id';
    assert.equal(StoogeCollection.prototype.modelId({_id: 1}), 1);
  });

  it('Polymorphic models work with "simple" constructors', function () {
    var A = Model.extend();
    var B = Model.extend();
    var C = Collection.extend({
      model: function (attrs) {
        return attrs.type === 'a' ? new A(attrs) : new B(attrs);
      }
    });
    var collection = new C([{id: 1, type: 'a'}, {id: 2, type: 'b'}]);
    assert.equal(collection.length, 2);
    assert.ok(collection.at(0) instanceof A);
    assert.equal(collection.at(0).id, 1);
    assert.ok(collection.at(1) instanceof B);
    assert.equal(collection.at(1).id, 2);
  });

  it('Polymorphic models work with "advanced" constructors', function () {
    var A = Model.extend({idAttribute: '_id'});
    var B = Model.extend({idAttribute: '_id'});
    var C = Collection.extend({
      model: Model.extend({
        constructor: function (attrs) {
          return attrs.type === 'a' ? new A(attrs) : new B(attrs);
        },

        idAttribute: '_id'
      })
    });
    var collection = new C([{_id: 1, type: 'a'}, {_id: 2, type: 'b'}]);
    assert.equal(collection.length, 2);
    assert.ok(collection.at(0) instanceof A);
    assert.equal(collection.at(0), collection.get(1));
    assert.ok(collection.at(1) instanceof B);
    assert.equal(collection.at(1), collection.get(2));

    C = Collection.extend({
      model: function (attrs) {
        return attrs.type === 'a' ? new A(attrs) : new B(attrs);
      },

      modelId: function (attrs) {
        return attrs.type + '-' + attrs.id;
      }
    });
    collection = new C([{id: 1, type: 'a'}, {id: 1, type: 'b'}]);
    assert.equal(collection.length, 2);
    assert.ok(collection.at(0) instanceof A);
    assert.equal(collection.at(0), collection.get('a-1'));
    assert.ok(collection.at(1) instanceof B);
    assert.equal(collection.at(1), collection.get('b-1'));
  });

  it("should fix jashkenas/backbone#3039: adding at index fires with correct at", function() {
    var col = new Collection([{at: 0}, {at: 4}]);
    col.on('add', function(model, col, options) {
      assert.equal(model.get('at'), options.index);
    });
    col.add([{at: 1}, {at: 2}, {at: 3}], {at: 1});
  });

  it("should fix jashkenas/backbone#3039: index is not sent when at is not specified", function() {
    var col = new Collection([{at: 0}]);
    col.on('add', function(model, col, options) {
      assert.equal(undefined, options.index);
    });
    col.add([{at: 1}, {at: 2}]);
  });

  it('#3199 - Order changing should trigger a sort', function() {
      var one = new Model({id: 1});
      var two = new Model({id: 2});
      var three = new Model({id: 3});
      var collection = new Collection([one, two, three]);
      collection.on('sort', function() {
        assert.ok(true);
      });
      collection.set([{id: 3}, {id: 2}, {id: 1}]);
  });

  it('#3199 - Adding a model should trigger a sort', function() {
    var one = new Model({id: 1});
    var two = new Model({id: 2});
    var three = new Model({id: 3});
    var collection = new Collection([one, two, three]);
    collection.on('sort', function() {
      assert.ok(true);
    });
    collection.set([{id: 3}, {id: 2}, {id: 1}, {id: 0}]);
  })

  it('#3199 - Order not changing should not trigger a sort', function() {
    var one = new Model({id: 1});
    var two = new Model({id: 2});
    var three = new Model({id: 3});
    var collection = new Collection([one, two, three]);
    collection.on('sort', function() {
      throw new Error("This should not be called");
    });
    collection.set([{id: 1}, {id: 2}, {id: 3}]);
  });

  it("add supports negative indexes", function() {
    var collection = new Collection([{id: 1}]);
    collection.add([{id: 2}, {id: 3}], {at: -1});
    collection.add([{id: 2.5}], {at: -2});
    assert.equal(collection.pluck('id').join(','), "1,2,2.5,3");
  });

  it("should fix jashkenas/backbone#set accepts options.at as a string", function() {
    var collection = new Collection([{id: 1}, {id: 2}]);
    collection.add([{id: 3}], {at: '1'});
    assert.deepEqual(collection.pluck('id'), [1, 3, 2]);
  });
  
  it("adding multiple models triggers `set` event once", function() {
    var collection = new Collection;
    collection.on('update', function() { assert.ok(true); });
    collection.add([{id: 1}, {id: 2}, {id: 3}]);
  });

  it("removing models triggers `set` event once", function() {
    var collection = new Collection([{id: 1}, {id: 2}, {id: 3}]);
    collection.on('update', function() { assert.ok(true); });
    collection.remove([{id: 1}, {id: 2}]);
  });

  it("remove does not trigger `set` when nothing removed", function() {
    var collection = new Collection([{id: 1}, {id: 2}]);
    collection.on('update', function() { throw new Error("This should not be called"); });
    collection.remove([{id: 3}]);
  });

  it("set triggers `set` event once", function() {
    var collection = new Collection([{id: 1}, {id: 2}]);
    collection.on('update', function() { assert.ok(true); });
    collection.set([{id: 1}, {id: 3}]);
  });

  it("set does not trigger `set` event when nothing added nor removed", function() {
    var collection = new Collection([{id: 1}, {id: 2}]);
    collection.on('update', function() { throw new Error("This should not be called"); });
    collection.set([{id: 1}, {id: 2}]);
  });

  it("should fix jashkenas/backbone#3610 - invoke collects arguments", function() {
    var AModel = Model.extend({
        method: function(a, b, c) {
            assert.equal(a, 1);
            assert.equal(b, 2);
            assert.equal(c, 3);
        }
    });
    var ACollection = Collection.extend({
        model: AModel
    });
    var collection = new ACollection([{id: 1}]);
    collection.invoke('method', 1, 2, 3);
  });

});
