This is a stand-alone Model and Collection implementation originally extracted from Backbone.

`~ 30Kb` minified and gzipped.

It has the full Backbone's test suite ported as well.

## A not on server- and client-side usage

The majority of `Model` and `Collection` functionality is generic which means the library can be used in an isomorphic way. Differences start when it comes to data synchronization.

Internally operations like `Model#save` or `Collection#fetch` run a function called `sync`. Each `Model` and `Collection` can override this function, but when they don't a global one is used.

For the client-side code you usually want to do an AJAX request to the RESTful API, while for the server-side you normally talk to the DB.

The library comes with the default `sync` implementation that does AJAX in the browser (if the `XMLHttpRequest` is available) and no-op in other environments. See the corresponding section in the end of this document for the detailed explanation and overriding instructions.
When talking about synchronization the following docs reference the default behavior, but remember that you can customize it.

## Model

Models contain the interactive data as well as a large part of the logic surrounding it: conversions, validations, computed properties, and access control. You extend `Model` with your domain-specific methods, and `Model` provides a basic set of functionality for managing changes.

The following is a contrived example, but it demonstrates defining a model with a custom method, setting an attribute, and firing an event keyed to changes in that specific attribute. After running this code once, `sidebar` will be available in your browser's console, so you can play around with it.

```
var Sidebar = Model.extend({
  promptColor: function() {
    var cssColor = prompt("Please enter a CSS color:");
    this.set({color: cssColor});
  }
});

window.sidebar = new Sidebar;

sidebar.on('change:color', function(model, color) {
  $('#sidebar').css({background: color});
});

sidebar.set({color: 'white'});

sidebar.promptColor();
```

### extend `Model.extend(properties, [classProperties])`

To create a **Model** class of your own, you extend **Model** and provide instance properties, as well as optional `classProperties` to be attached directly to the constructor function.

`extend` correctly sets up the prototype chain, so subclasses created with extend can be further extended and subclassed as far as you like.

```
var Note = Model.extend({

  initialize: function() { ... },

  author: function() { ... },

  coordinates: function() { ... },

  allowedToEdit: function(account) {
    return true;
  }

});

var PrivateNote = Note.extend({

  allowedToEdit: function(account) {
    return account.owns(this);
  }

});
```

_Brief aside on `super`: JavaScript does not provide a simple way to call super — the function of the same name defined higher on the prototype chain. If you override a core function like `set`, or `save`, and you want to invoke the parent object's implementation, you'll have to explicitly call it, along these lines:_

```
var Note = Model.extend({
  set: function(attributes, options) {
    Model.prototype.set.apply(this, arguments);
    ...
  }
});
```

### constructor / initialize `new Model([attributes], [options])`

When creating an instance of a model, you can pass in the initial values of the `attributes`, which will be `set` on the model. If you define an `initialize` function, it will be invoked when the model is created.

```
new Book({
  title: "One Thousand and One Nights",
  author: "Scheherazade"
});
```

In rare cases, if you're looking to get fancy, you may want to override `constructor`, which allows you to replace the actual constructor function for your model.

```
var Library = Model.extend({
  constructor: function() {
    this.books = new Books();
    Model.apply(this, arguments);
  },
  parse: function(data, options) {
    this.books.reset(data.books);
    return data.library;
  }
});
```

If you pass a `{collection: ...}` as the `options`, the model gains a `collection` property that will be used to indicate which collection the model belongs to, and is used to help compute the model's `url`. The `model.collection` property is normally created automatically when you first add a model to a collection. Note that the reverse is not true, as passing this option to the constructor will not automatically add the model to the collection. Useful, sometimes.

If `{parse: true}` is passed as an option, the `attributes` will first be converted by `parse` before being `set` on the model.

### get `model.get(attribute)`

Get the current value of an attribute from the model. For example: `note.get("title")`

### set `model.set(attributes, [options])`

Set a hash of attributes (one or many) on the model. If any of the attributes change the model's state, a `"change"` event will be triggered on the model. Change events for specific attributes are also triggered, and you can bind to those as well, for example: `change:title`, and `change:content`. You may also pass individual keys and values.

```
note.set({title: "March 20", content: "In his eyes she eclipses..."});

book.set("title", "A Scandal in Bohemia");
```

### escape `model.escape(attribute)`

Similar to `get`, but returns the HTML-escaped version of a model's attribute. If you're interpolating data from the model into HTML, using `escape` to retrieve attributes will prevent XSS attacks.

```
var hacker = new Model({
  name: "<script>alert('xss')</script>"
});

alert(hacker.escape('name'));
```

### has `model.has(attribute)`

Returns `true` if the attribute is set to a non-null or non-undefined value.

```
if (note.has("title")) {
  ...
}
```

### unset `model.unset(attribute, [options])`

Remove an attribute by deleting it from the internal attributes hash. Fires a `"change"` event unless `silent` is passed as an option.

### clear `model.clear([options])`

Removes all attributes from the model, including the `id` attribute. Fires a `"change"` event unless `silent` is passed as an option.

### id `model.id`

A special property of models, the `id` is an arbitrary string (integer id or UUID). If you set the `id` in the attributes hash, it will be copied onto the model as a direct property. Models can be retrieved by id from collections, and the id is used to generate model URLs by default.

### idAttribute `model.idAttribute`

A model's unique identifier is stored under the `id` attribute. If you're directly communicating with a backend (CouchDB, MongoDB) that uses a different unique key, you may set a Model's `idAttribute` to transparently map from that key to `id`.

```
var Meal = Model.extend({
  idAttribute: "_id"
});

var cake = new Meal({ _id: 1, name: "Cake" });
alert("Cake id: " + cake.id);
```

### cid `model.cid`

A special property of models, the `cid` or client id is a unique identifier automatically assigned to all models when they're first created. Client ids are handy when the model has not yet been saved to the server, and does not yet have its eventual true id, but already needs to be visible in the UI.

### attributes `model.attributes`

The attributes property is the internal hash containing the model's state — usually (but not necessarily) a form of the JSON object representing the model data on the server. It's often a straightforward serialization of a row from the database, but it could also be client-side computed state.

Please use `set` to update the attributes instead of modifying them directly. If you'd like to retrieve and munge a copy of the model's attributes, use `_.clone(model.attributes)` instead.

_Due to the fact that [Events](https://github.com/IsoldaJS/isolda-pubsub) accepts space separated lists of events, attribute names should not include spaces._

### changed `model.changed`

The `changed` property is the internal hash containing all the attributes that have changed since its last `set`. Please do not update `changed` directly since its state is internally maintained by `set`. A copy of `changed` can be acquired from `changedAttributes`.

### defaults `model.defaults or model.defaults()`

The defaults hash (or function) can be used to specify the default attributes for your model. When creating an instance of the model, any unspecified attributes will be set to their default value.

```
var Meal = Model.extend({
  defaults: {
    "appetizer":  "caesar salad",
    "entree":     "ravioli",
    "dessert":    "cheesecake"
  }
});

alert("Dessert will be " + (new Meal).get('dessert'));
```

_Remember that in JavaScript, objects are passed by reference, so if you include an object as a default value, it will be shared among all instances. Instead, define `defaults` as a function._

### toJSON `model.toJSON([options])`

Return a shallow copy of the model's `attributes` for JSON stringification. This can be used for persistence, serialization, or for augmentation before being sent to the server. The name of this method is a bit confusing, as it doesn't actually return a JSON string — but I'm afraid that it's the way that the [JavaScript API for JSON.stringify works](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#toJSON_behavior).

```
var artist = new Model({
  firstName: "Wassily",
  lastName: "Kandinsky"
});

artist.set({birthday: "December 16, 1866"});

alert(JSON.stringify(artist));
```

### sync `model.sync(method, model, [options])`

Uses internal `sync` to persist the state of a model. Can be overridden for custom behavior. Read below for details on the default sync behavior and how it can be customized for all models and collections of your app.

### fetch `model.fetch([options])`

Merges the model's state with attributes fetched from the server by delegating to `sync`. Returns whatever `sync` returns. Useful if the model has never been populated with data, or if you'd like to ensure that you have the latest server state. Triggers a `"change"` event if the server's state differs from the current attributes. fetch accepts `success` and `error` callbacks in the options hash, which are both passed `(model, response, options)` as arguments.

```
// Poll every 10 seconds to keep the channel model up-to-date.
setInterval(function() {
  channel.fetch();
}, 10000);
```

### save `model.save([attributes], [options])`

Save a model to your database (or alternative persistence layer), by delegating to `sync`. Returns whatever `sync` if validation is successful and `false` otherwise. The `attributes` hash (as in `set`) should contain the attributes you'd like to change — keys that aren't mentioned won't be altered — but, a complete representation of the resource will be sent to the server. As with `set`, you may pass individual keys and values instead of a hash. If the model has a `validate` method, and validation fails, the model will not be saved. If the model `isNew`, the save will be a "create" (HTTP POST for default `sync`), if the model already exists on the server, the save will be an "update" (HTTP PUT).

If instead, you'd only like the _changed_ attributes to be sent to the server, call `model.save(attrs, {patch: true})`. You'll get an HTTP PATCH request to the server (for default `sync`) with just the passed-in attributes.

Calling `save` with new attributes will cause a `"change"` event immediately, a `"request"` event as the Ajax request begins to go to the server, and a `"sync"` event after the server has acknowledged the successful change. Pass `{wait: true}` if you'd like to wait for the server before setting the new attributes on the model.

In the following example, notice how our overridden version of `sync` receives a `"create"` request the first time the model is saved and an `"update"` request the second time.


```
var models = require('@isoldajs/models');

models.setSync(function(method, model) {
  alert(method + ": " + JSON.stringify(model));
  model.set('id', 1);
});

var book = new models.Model({
  title: "The Rough Riders",
  author: "Theodore Roosevelt"
});

book.save();

book.save({author: "Teddy"});
```

`save` accepts `success` and `error` callbacks in the `options` hash, which will be passed the arguments `(model, response, options)`. If a server-side validation fails, return a non-200 HTTP response code, along with an error response in text or JSON.

```
book.save("author", "F.D.R.", {error: function(){ ... }});
```

### destroy `model.destroy([options])`

Destroys the model on the server by delegating an HTTP DELETE request to `sync` (for default implementation). Returns the result of `sync`, or `false` if the model `isNew`. Accepts `success` and `error` callbacks in the options hash, which will be passed `(model, response, options)`. Triggers a `"destroy"` event on the model, which will bubble up through any collections that contain it, a `"request"` event as it begins the Ajax request to the server, and a `"sync"` event, after the server has successfully acknowledged the model's deletion. Pass `{wait: true}` if you'd like to wait for the server to respond before removing the model from the collection.

```
book.destroy({success: function(model, response) {
  ...
}});
```

### Lodash Methods (9)

`Model` proxies to Lodash to provide 9 object functions. Check Lodash docs for the full details.

* [`keys`](https://lodash.com/docs#keys)
* [`values`](https://lodash.com/docs#values)
* [`pairs`](https://lodash.com/docs#pairs)
* [`invert`](https://lodash.com/docs#invert)
* [`pick`](https://lodash.com/docs#pick)
* [`omit`](https://lodash.com/docs#omit)
* [`matches`](https://lodash.com/docs#matches)
* [`chain`](https://lodash.com/docs#chain)
* [`isEmpty`](https://lodash.com/docs#isEmpty)


```
user.pick('first_name', 'last_name', 'email');

chapters.keys().join(', ');
```

### validate `model.validate(attributes, options)`

This method is left undefined and you're encouraged to override it with any custom validation logic you have that can be performed in JavaScript. By default `save` checks `validate` before setting any attributes but you may also tell `set` to validate the new attributes by passing `{validate: true}` as an option.
The `validate` method receives the model attributes as well as any options passed to `set` or `save`. If the attributes are valid, don't return anything from `validate`; if they are invalid return an error of your choosing. It can be as simple as a string error message to be displayed, or a complete error object that describes the error programmatically. If `validate` returns an error, `save` will not continue, and the model attributes will not be modified on the server. Failed validations trigger an `"invalid"` event, and set the `validationError` property on the model with the value returned by this method.

```
var Chapter = Model.extend({
  validate: function(attrs, options) {
    if (attrs.end < attrs.start) {
      return "can't end before it starts";
    }
  }
});

var one = new Chapter({
  title : "Chapter One: The Beginning"
});

one.on("invalid", function(model, error) {
  alert(model.get("title") + " " + error);
});

one.save({
  start: 15,
  end:   10
});
```

`"invalid"` events are useful for providing coarse-grained error messages at the model or collection level.

### validationError `model.validationError`

The value returned by `validate` during the last failed validation.

### isValid `model.isValid()`

Run `validate` to check the model state.

```
var Chapter = Model.extend({
  validate: function(attrs, options) {
    if (attrs.end < attrs.start) {
      return "can't end before it starts";
    }
  }
});

var one = new Chapter({
  title : "Chapter One: The Beginning"
});

one.set({
  start: 15,
  end:   10
});

if (!one.isValid()) {
  alert(one.get("title") + " " + one.validationError);
}
```

### url `model.url()`

Returns the relative URL where the model's resource would be located on the server. If your models are located somewhere else, override this method with the correct logic. Generates URLs of the form: `"[collection.url]/[id]"` by default, but you may override by specifying an explicit `urlRoot` if the model's collection shouldn't be taken into account.

Delegates to `Collection#url` to generate the URL, so make sure that you have it defined, or a `urlRoot` property, if all models of this class share a common root URL. A model with an id of `101`, stored in a `Collection` with a `url` of `"/documents/7/notes"`, would have this URL: `"/documents/7/notes/101"`

### urlRoot `model.urlRoot or model.urlRoot()`

Specify a `urlRoot` if you're using a model _outside_ of a collection, to enable the default `url` function to generate URLs based on the model id. `"[urlRoot]/id"`
Normally, you won't need to define this. Note that `urlRoot` may also be a function.

```
var Book = Model.extend({urlRoot : '/books'});

var solaris = new Book({id: "1083-lem-solaris"});

alert(solaris.url());
```

### parse `model.parse(response, options)`

`parse` is called whenever a model's data is returned by the server, in `fetch`, and `save`. The function is passed the raw `response` object, and should return the attributes hash to be `set` on the model. The default implementation is a no-op, simply passing through the JSON response. Override this if you need to work with a preexisting API, or better namespace your responses.

### clone `model.clone()`

Returns a new instance of the model with identical attributes.

### isNew `model.isNew()`

Has this model been saved to the server yet? If the model does not yet have an `id`, it is considered to be new.

### hasChanged `model.hasChanged([attribute])`

Has the model changed since its last `set`? If an `attribute` is passed, returns `true` if that specific attribute has changed.

_Note that this method, and the following change-related ones, are only useful during the course of a `"change"` event._

```
book.on("change", function() {
  if (book.hasChanged("title")) {
    ...
  }
});
```

### changedAttributes `model.changedAttributes([attributes])`

Retrieve a hash of only the model's attributes that have changed since the last `set`, or `false` if there are none. Optionally, an external `attributes` hash can be passed in, returning the attributes in that hash which differ from the model. This can be used to figure out which portions of a view should be updated, or what calls need to be made to sync the changes to the server.

### previous `model.previous(attribute)`

During a `"change"` event, this method can be used to get the previous value of a changed `attribute`.

```
var bill = new Model({
  name: "Bill Smith"
});

bill.on("change:name", function(model, name) {
  alert("Changed name from " + bill.previous("name") + " to " + name);
});

bill.set({name : "Bill Jones"});
```

### previousAttributes `model.previousAttributes()`

Return a copy of the model's previous attributes. Useful for getting a diff between versions of a model, or getting back to a valid state after an error occurs.

## Collection

Collections are ordered sets of models. You can bind `"change"` events to be notified when any model in the collection has been modified, listen for `"add"` and `"remove"` events, `fetch` the collection from the server, and use a full suite of Lodash methods.

Any event that is triggered on a model in a collection will also be triggered on the collection directly, for convenience. This allows you to listen for changes to specific attributes in any model in a collection, for example: `documents.on("change:selected", ...)`

### extend `Collection.extend(properties, [classProperties])`

To create a `Collection` class of your own, extend `Collection`, providing instance `properties`, as well as optional `classProperties` to be attached directly to the collection's constructor function.

### model `collection.model`

Override this property to specify the model class that the collection contains. If defined, you can pass raw attributes objects (and arrays) to `add`, `create`, and `reset`, and the attributes will be converted into a model of the proper type.

```
var Library = Collection.extend({
  model: Book
});
```

A collection can also contain polymorphic models by overriding this property with a constructor that returns a model.

```
var Library = Collection.extend({

  model: function(attrs, options) {
    if (condition) {
      return new PublicDocument(attrs, options);
    } else {
      return new PrivateDocument(attrs, options);
    }
  }

});
```

### modelId `collection.modelId`

Override this method to specify the attribute the collection will use to refer to its models in `collection.get`.
By default returns the `idAttribute` of the collection's model class or failing that, `'id'`. If your collection uses polymorphic models and those models have an `idAttribute` other than `'id'` you must override this method with your own custom logic.

```
var Library = Collection.extend({

  model: function(attrs, options) {
    if (condition) {
      return new PublicDocument(attrs, options);
    } else {
      return new PrivateDocument(attrs, options);
    }
  },

  modelId: function(attrs) {
    return attrs.private ? 'private_id' : 'public_id';
  }

});
```

### constructor / initialize `new Collection([models], [options])`

When creating a `Collection`, you may choose to pass in the initial array of `models`. The collection's `comparator` may be included as an option. Passing `false` as the comparator option will prevent sorting. If you define an `initialize` function, it will be invoked when the collection is created. There are a couple of options that, if provided, are attached to the collection directly: `model` and `comparator`.
Pass `null` for `models` to create an empty `Collection` with `options`.

```
var tabs = new TabSet([tab1, tab2, tab3]);
var spaces = new Collection([], {
  model: Space
});
```

### models `collection.models`

Raw access to the JavaScript array of `models` inside of the collection. Usually you'll want to use `get`, `at`, or the Lodash methods to access model objects, but occasionally a direct reference to the array is desired.

### toJSON `collection.toJSON([options])`

Return an array containing the attributes hash of each model (via `toJSON`) in the collection. This can be used to serialize and persist the collection as a whole. The name of this method is a bit confusing, because it conforms to JavaScript's [JSON API](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#toJSON_behavior).

```
var collection = new Collection([
  {name: "Tim", age: 5},
  {name: "Ida", age: 26},
  {name: "Rob", age: 55}
]);

alert(JSON.stringify(collection));
```

### sync `collection.sync(method, collection, [options])`
Uses `sync` to persist the state of a collection to the server. Can be overridden for custom behavior.

### Lodash Methods (46)

Collection proxies to Lodash to provide 46 iteration functions. Check the Lodash documentation for the full details.

* [forEach (each)](https://lodash.com/docs#forEach)
* [map (collect)](https://lodash.com/docs#map)
* [reduce (foldl, inject)](https://lodash.com/docs#reduce)
* [reduceRight (foldr)](https://lodash.com/docs#reduceRight)
* [find (detect)](https://lodash.com/docs#find)
* [filter (select)](https://lodash.com/docs#filter)
* [reject](https://lodash.com/docs#reject)
* [every (all)](https://lodash.com/docs#every)
* [some (any)](https://lodash.com/docs#some)
* [contains (include)](https://lodash.com/docs#contains)
* [invoke](https://lodash.com/docs#invoke)
* [max](https://lodash.com/docs#max)
* [min](https://lodash.com/docs#min)
* [sortBy](https://lodash.com/docs#sortBy)
* [groupBy](https://lodash.com/docs#groupBy)
* [shuffle](https://lodash.com/docs#shuffle)
* [toArray](https://lodash.com/docs#toArray)
* [size](https://lodash.com/docs#size)
* [first (head, take)](https://lodash.com/docs#first)
* [initial](https://lodash.com/docs#initial)
* [rest (tail, drop)](https://lodash.com/docs#rest)
* [last](https://lodash.com/docs#last)
* [without](https://lodash.com/docs#without)
* [indexOf](https://lodash.com/docs#indexOf)
* [lastIndexOf](https://lodash.com/docs#lastIndexOf)
* [isEmpty](https://lodash.com/docs#isEmpty)
* [chain](https://lodash.com/docs#chain)
* [difference](https://lodash.com/docs#difference)
* [sample](https://lodash.com/docs#sample)
* [partition](https://lodash.com/docs#partition)
* [countBy](https://lodash.com/docs#countBy)
* [indexBy](https://lodash.com/docs#indexBy)

```
books.each(function(book) {
  book.publish();
});

var titles = books.map(function(book) {
  return book.get("title");
});

var publishedBooks = books.filter(function(book) {
  return book.get("published") === true;
});

var alphabetical = books.sortBy(function(book) {
  return book.author.get("name").toLowerCase();
});
```

### add `collection.add(models, [options])`

Add a model (or an array of models) to the collection, firing an `"add"` event for each model, and an `"update"` event afterwards. If a `model` property is defined, you may also pass raw attributes objects, and have them be vivified as instances of the model. Returns the added (or preexisting, if duplicate) models. Pass `{at: index}` to splice the model into the collection at the specified `index`. If you're adding models to the collection that are already in the collection, they'll be ignored, unless you pass `{merge: true}`, in which case their attributes will be merged into the corresponding models, firing any appropriate `"change"` events.

```
var ships = new Collection();

ships.on("add", function(ship) {
  alert("Ahoy " + ship.get("name") + "!");
});

ships.add([
  {name: "Flying Dutchman"},
  {name: "Black Pearl"}
]);
```

_Note that adding the same model (a model with the same `id`) to a collection more than once is a no-op._

### remove `collection.remove(models, [options])`

Remove a model (or an array of models) from the collection, and return them. Each model can be a Model instance, an `id` string or a JS object, any value acceptable as the `id` argument of `collection.get`. Fires a `"remove"` event for each model, and a single `"update"` event afterwards. The model's index before removal is available to listeners as `options.index`.

### reset `collection.reset([models], [options])`

Adding and removing models one at a time is all well and good, but sometimes you have so many models to change that you'd rather just update the collection in bulk. Use `reset` to replace a collection with a new list of models (or attribute hashes), triggering a single `"reset"` event at the end. Returns the newly-set models. For convenience, within a `"reset"` event, the list of any previous models is available as `options.previousModels`.
Pass `null` for `models` to empty your `Collection` with `options`.

Here's an example using reset to bootstrap a collection during initial page load, in a Node.js application using the EJS template language:

```
<script>
  var accounts = new Collection();
  accounts.reset(<%= JSON.stringify(accounts) %>);
</script>
```

Calling `collection.reset()` without passing any models as arguments will empty the entire collection.

### set `collection.set(models, [options])`

The `set` method performs a "smart" update of the collection with the passed list of models. If a model in the list isn't yet in the collection it will be added; if the model is already in the collection its attributes will be merged; and if the collection contains any models that aren't present in the list, they'll be removed. All of the appropriate `"add"`, `"remove"`, and `"change"` events are fired as this happens. Returns the touched models in the collection. If you'd like to customize the behavior, you can disable it with options: `{add: false}`, `{remove: false}`, or `{merge: false}`.

```
var vanHalen = new Collection([eddie, alex, stone, roth]);

vanHalen.set([eddie, alex, stone, hagar]);

// Fires a "remove" event for roth, and an "add" event for "hagar".
// Updates any of stone, alex, and eddie's attributes that may have
// changed over the years.
```

#### get `collection.get(id)`

Get a model from a collection, specified by an `id`, a `cid`, or by passing in a `model`.

```
var book = library.get(110);
```

### at `collection.at(index)`

Get a model from a collection, specified by `index`. Useful if your collection is sorted, and if your collection isn't sorted, `at` will still retrieve models in insertion order.

### push `collection.push(model, [options])`

Add a model at the end of a collection. Takes the same options as `add`.

### pop `collection.pop([options])`

Remove and return the last model from a collection. Takes the same options as `remove`.

###unshift `collection.unshift(model, [options])`

Add a model at the beginning of a collection. Takes the same options as `add`.

### shift `collection.shift([options])`

Remove and return the first model from a collection. Takes the same options as `remove`.

### slice `collection.slice(begin, end)`

Return a shallow copy of this collection's models, using the same options as native `Array#slice`.

### length `collection.length`

Like an array, a `Collection` maintains a `length` property, counting the number of models it contains.

### comparator `collection.comparator`

By default there is no `comparator` for a collection. If you define a comparator, it will be used to maintain the collection in sorted order. This means that as models are added, they are inserted at the correct index in `collection.models`. A comparator can be defined as a `sortBy` (pass a function that takes a single argument), as a `sort` (pass a comparator function that expects two arguments), or as a string indicating the attribute to sort by.

`"sortBy"` comparator functions take a model and return a numeric or string value by which the model should be ordered relative to others. `"sort"` comparator functions take two models, and return `-1` if the first model should come before the second, `0` if they are of the same rank and `1` if the first model should come after. _Note that the library depends on the arity of your comparator function to determine between the two styles, so be careful if your comparator function is bound._

Note how even though all of the chapters in this example are added backwards, they come out in the proper order:

```
var Chapter  = Model;
var chapters = new Collection();

chapters.comparator = 'page';

chapters.add(new Chapter({page: 9, title: "The End"}));
chapters.add(new Chapter({page: 5, title: "The Middle"}));
chapters.add(new Chapter({page: 1, title: "The Beginning"}));

alert(chapters.pluck('title'));
```

_Collections with a comparator will not automatically re-sort if you later change model attributes, so you may wish to call `sort` after changing model attributes that would affect the order._

### sort `collection.sort([options])`

Force a collection to re-sort itself. You don't need to call this under normal circumstances, as a collection with a `comparator` will sort itself whenever a model is added. To disable sorting when adding a model, pass `{sort: false}` to `add`. Calling `sort` triggers a `"sort"` event on the collection.

### pluck `collection.pluck(attribute)`

Pluck an attribute from each model in the collection. Equivalent to calling `map` and returning a single attribute from the iterator.

```
var stooges = new Collection([
  {name: "Curly"},
  {name: "Larry"},
  {name: "Moe"}
]);

var names = stooges.pluck("name");

alert(JSON.stringify(names));
```

### where `collection.where(attributes)`

Return an array of all the models in a collection that match the passed `attributes`. Useful for simple cases of `filter`.

```
var friends = new Collection([
  {name: "Athos",      job: "Musketeer"},
  {name: "Porthos",    job: "Musketeer"},
  {name: "Aramis",     job: "Musketeer"},
  {name: "d'Artagnan", job: "Guard"},
]);

var musketeers = friends.where({job: "Musketeer"});

alert(musketeers.length);
```

### findWhere `collection.findWhere(attributes)`

Just like `where`, but directly returns only the first model in the collection that matches the passed `attributes`.

### url `collection.url or collection.url()`

Set the `url` property (or function) on a collection to reference its location on the server. Models within the collection will use `url` to construct URLs of their own.

```
var Notes = Collection.extend({
  url: '/notes'
});

// Or, something more sophisticated:

var Notes = Collection.extend({
  url: function() {
    return this.document.url() + '/notes';
  }
});
```

### parse `collection.parse(response, options)`

`parse` is called whenever a collection's models are returned by the server, in `fetch`. The function is passed the raw `response` object, and should return the array of model attributes to be `added` to the collection. The default implementation is a no-op, simply passing through the JSON response. Override this if you need to work with a preexisting API, or better namespace your responses.

```
var Tweets = Collection.extend({
  // The Twitter Search API returns tweets under "results".
  parse: function(response) {
    return response.results;
  }
});
```

### clone `collection.clone()`

Returns a new instance of the collection with an identical list of models.

### fetch `collection.fetch([options])`

Fetch the default set of models for this collection from the server, `setting` them on the collection when they arrive. The `options` hash takes `success` and `error` callbacks which will both be passed `(collection, response, options)` as arguments. When the model data returns from the server, it uses `set` to (intelligently) merge the fetched models, unless you pass `{reset: true}`, in which case the collection will be (efficiently) `reset`. Delegates to `sync` under the covers for custom persistence strategies and returns whatever `sync` returns. The server handler for `fetch` requests should return a JSON array of models.

```
var models = require('@isoldajs/models');
models.setSync(function(method, model) {
  alert(method + ": " + model.url);
});

var accounts = new models.Collection();
accounts.url = '/accounts';

accounts.fetch();
```

The behavior of `fetch` can be customized by using the available `set` options. For example, to fetch a collection, getting an `"add"` event for every new model, and a `"change"` event for every changed existing model, without removing anything: `collection.fetch({remove: false})`

`ajax` options can also be passed directly as fetch options, so to fetch a specific page of a paginated collection: `Documents.fetch({data: {page: 3}})`

### create `collection.create(attributes, [options])`

Convenience to create a new instance of a model within a collection. Equivalent to instantiating a model with a hash of attributes, saving the model to the server, and adding the model to the set after being successfully created. Returns the new model. If client-side validation failed, the model will be unsaved, with validation errors. In order for this to work, you should set the `model` property of the collection. The `create` method can accept either an attributes hash or an existing, unsaved model object.

Creating a model will cause an immediate `"add"` event to be triggered on the collection, a `"request"` event as the new model is sent to the server, as well as a `"sync"` event, once the server has responded with the successful creation of the model. Pass `{wait: true}` if you'd like to wait for the server before adding the new model to the collection.

```
var Library = Collection.extend({
  model: Book
});

var nypl = new Library();

var othello = nypl.create({
  title: "Othello",
  author: "William Shakespeare"
});
```

## Sync

As explained in the beginning of the document `sync` is the central point of communication with the data layer. For the client-side usage it's often a REST service, while for the server-side normally it's a DB of some kind.

The default `sync` uses `XMLHttpRequest` to make a RESTful JSON request and returns an `XMLHttpRequest` instance. You can override it in order to use a different persistence strategy, such as WebSockets, XML transport, or Local Storage.

The method signature of `sync` is `sync(method, model, [options])`

* `method` – the CRUD method (`"create"`, `"read"`, `"update"`, `"patch"`, or `"delete"`)
* `model` – the model to be saved (or collection to be read)
* `options` – success and error callbacks, and all other request options

Whenever a model or collection begins a sync with the server, a `"request"` event is emitted. If the request completes successfully you'll get a `"sync"` event, and an `"error"` event if not.

The `sync` function may be overridden globally with `setSync`, or at a finer-grained level, by adding a `sync` function to a collection or to an individual model.

### getSync `models.getSync`

You can retrieve the currently set global `sync` using the `getSync` method:

```
var models = require('@isoldajs/models');

var sync = models.getSync();
```

### setSync `models.setSync`

To override the built-in `sync` call the `setSync` function:

```
var models = require('@isoldajs/models');

var originalSync = models.getSync();

models.setSync(function(method, model) {
  alert(method + ": " + JSON.stringify(model));
  originalSync.apply(null, arguments);
});
```

### Default `sync` implementation

With the default implementation, when `sync` sends up a request to save a model, its attributes will be passed, serialized as JSON, and sent in the HTTP body with content-type `application/json`. When returning a JSON response, send down the attributes of the model that have been changed by the server, and need to be updated on the client. When responding to a `"read"` request from a collection (`Collection#fetch`), send down an array of model attribute objects.

The default `sync` handler maps CRUD to REST like so:

* create → POST `/collection`
* read → GET `/collection[/id]`
* update → PUT `/collection/id`
* patch → PATCH `/collection/id`
* delete → DELETE `/collection/id`

#### getAjax `models.getAjax`

By default if `XMLHttpRequest` is defined in the runtime environment (which is the case for any modern web-browser) the default `sync` function calls the default `ajax` function provided by the [`@isoldajs/browser-ajax` package](https://github.com/IsoldaJS/isolda-browser-ajax).

You can get the currently set `ajax` function with the call to `getAjax`:

```
var models = require('@isoldajs/models');

var ajax = models.getAjax();
```

#### setAjax `models.setAjax`

If you want to use a custom AJAX function, or you need to tweak things, you can do so by calling `setAjax`.

```
var models = require('@isoldajs/models');

var originalAjax = models.getAjax();

models.setAjax(function(options) {
  alert("AJAX: " + JSON.stringify(options));
  originalAjax.apply(null, arguments);
});
```

#### emulateHTTP `sync.emulateHTTP = true`

If you want to work with a legacy web server that doesn't support default REST/HTTP approach, you may choose to turn on `sync.emulateHTTP` (_note: this is a feature of the default built-in `sync` implementation_). Setting this option will fake `PUT`, `PATCH` and `DELETE` requests with a `HTTP POST`, setting the `X-HTTP-Method-Override` header with the true method. If `emulateJSON` is also on, the true method will be passed as an additional `_method` parameter.

```
var models = require('@isoldajs/models');
var sync = models.getSync();
sync.emulateHTTP = true;

model.save();  // POST to "/collection/id", with `X-HTTP-Method-Override` header.
```

#### emulateJSON `sync.emulateJSON = true`

If you're working with a legacy web server that can't handle requests encoded as `application/json`, setting `sync.emulateJSON = true` will cause the JSON to be serialized under a `model` parameter, and the request to be made with a `application/x-www-form-urlencoded` MIME type, as if from an HTML form. (_Note: this is a feature of the default built-in `sync` implementation_).

```
var models = require('@isoldajs/models');
var sync = models.getSync();
sync.emulateHTTP = true;
sync.emulateJSON = true;

model.save();  // POST to "/collection/id", with `X-HTTP-Method-Override` header + "_method=PUT" + data sent as `application/x-www-form-urlencoded`.
```
