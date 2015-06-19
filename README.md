This is a stand-alone Model and Collection implementation based on Backbone. `~ 30Kb` minified and gzipped.

It has the full Backbone's test suite ported as well.

## Model

Models contain the interactive data as well as a large part of the logic surrounding it: conversions, validations, computed properties, and access control. You extend **Model** with your domain-specific methods, and **Model** provides a basic set of functionality for managing changes.

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
var artist = new Backbone.Model({
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
