couchapp-push
=============

Very simple node.js module to push a couchapp to couchdb. Inspired by [node.couchapp.js](https://github.com/mikeal/node.couchapp.js)

### How to use

Add a file `app.js` in a folder to define a design document. 

Files in the subfolder `_attachments` are automaticaly pushed as attachments on the ddoc.

Example, file structure:

	path/to/couchapp
		app.js
		_attachments/
			index.html
			css/
				app.css
				bootstrap.css
			js/
				ember.js
				

From a node module or Jakefile, 
<pre>

var couchpush = require('path/to/couchapp-push');

couchpush.push('path/to/couchapp', 'http://admin:password@localhost:5984/mydb', function(err, dbResponse){
	//...
});
	
</pre>

### app.js examples

**Synchonous**
<pre>
module.exports = ddoc = {
  _id: '_design/app',
  views:{
    foo: {
      map: function(doc) {
          emit(doc.foo, null);
      },
      reduce: "_count"
    }
  }
};

ddoc.validate_doc_update = function(newDoc, oldDoc, userCtx) {
  if (newDoc._deleted === true && userCtx.roles.indexOf('_admin') === -1) {
    throw "Only admin can delete documents on this database.";
  }
}
</pre>


**Asynchonous**
<pre>
var fs = require('fs');

module.exports = function(cb) {
	var ddoc = {
		_id: '_design/native',
		language: 'erlang',
		views: {
			events: {
				map: null
			}
		}
	}
	fs.readFile(__dirname + '/views/events/map.erl', {
		encoding: 'utf8'
	}, function(err, data) {
		if (err) {
			cb(err);
			return;
		}
		ddoc.views.events.map = data;
		//doc is ready
		cb(null, ddoc);
	});
}
</pre>