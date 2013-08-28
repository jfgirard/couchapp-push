var url = require('url'),
	path = require('path'),
	http = require('http'),
	fs = require('fs'),
	mimetypes = require('./mimetypes.js');

function abspath(pathname) {
	if (pathname[0] === '/') return pathname;
	return path.join(process.cwd(), path.normalize(pathname));
}

function buildDoc(dir, cb) {
	var app = require(dir + '/app.js');
	if (typeof app === 'function') {
		//async
		app(cb);
	} else {
		cb(null, app);
	}
}

function push(docPath, couchUrl, cb) {
	var dir = abspath(docPath);
	buildDoc(dir, function(err, doc) {
		if (err) {
			cb(err);
			return;
		}
		var reqUrl = url.parse(couchUrl);
		getDoc(reqUrl, doc._id, function(err, docDb) {
			if (err) {
				cb(err);
				return;
			}
			if (docDb) {
				//update the revision
				doc._rev = docDb._rev;
			}
			doc._attachments = {};
			var attachmentsDir = dir + '/_attachments';
			var totalFiles = 1;

			function directoryLookup(dir, prefix) {
				fs.readdir(dir, function(err, files) {
					if (err) {
						//no files
						pushDoc(reqUrl, doc, cb);
						return;
					}
					totalFiles += files.length - 1;
					for (i in files) {
						(function(f) {
							var filePath = dir + '/' + f;
							fs.stat(filePath, function(err, stats) {
								if (err) {
									cb(err);
									return;
								}
								if (stats.isDirectory()) {
									directoryLookup(filePath, (prefix ? prefix + f : f) + '/');
								} else {
									fs.readFile(filePath, function(err, data) {
										if (err) {
											cb(err);
											return;
										}
										var d = data.toString('base64'),
											mime = mimetypes.lookup(path.extname(f).slice(1));
										doc._attachments[prefix ? prefix + f : f] = {
											data: d,
											content_type: mime
										};
										totalFiles--;
										if (totalFiles === 0) {
											pushDoc(reqUrl, doc, cb);
										}
									});
								}
							});

						})(files[i]);
					}
				});
			}

			directoryLookup(attachmentsDir);
		});
	});
}

function getDoc(reqUrl, id, cb) {

	var hash = {
		host: reqUrl.hostname,
		port: reqUrl.port || 80,
		path: reqUrl.pathname + '/' + id,
		method: 'GET',
		auth: reqUrl.auth
	};

	//GET
	http.request(hash, function(response) {
		response.setEncoding('utf8');
		var body = '';
		response.on('readable', function() {
			body += response.read();
		});
		response.on('end', function() {
			if (response.statusCode === 404) {
				cb(null, null);
				return;
			}
			var obj = JSON.parse(body);
			if (response.statusCode !== 200) {
				cb(obj);
				return;
			}
			cb(null, obj);
		});
	}).on('error', function(err) {
		cb(err);
	}).end();
}

function serialize = function(x) {
	for (i in x) {
		if (i[0] != '_') {
			if (typeof x[i] == 'function') {
				x[i] = x[i].toString()
				x[i] = 'function ' + x[i].slice(x[i].indexOf('('))
			}
			if (typeof x[i] == 'object') {
				serialize(x[i])
			}
		}
	}
}


function pushDoc(reqUrl, doc, cb) {s

	//prepare for JSON.stringify 
	serialize(doc);

	var content = JSON.stringify(doc);

	var hash = {
		host: reqUrl.hostname,
		port: reqUrl.port || 80,
		path: reqUrl.pathname + '/' + doc._id,
		method: 'PUT',
		auth: reqUrl.auth
	};

	var headers = {
		'content-type': 'application/json',
		'content-length': Buffer.byteLength(content)
	}

	//PUT 
	http.request(hash, function(response) {
		response.setEncoding('utf8');
		var body = '';
		response.on('readable', function() {
			body += response.read();
		});
		response.on('end', function() {
			var obj = JSON.parse(body);
			if (response.statusCode !== 201) {
				cb(obj);
				return;
			}
			cb(null, obj);
		});
	}).on('error', function(err) {
		cb(err);
	}).end(content);
}


module.exports.push = push;