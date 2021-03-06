/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2015, Joyent, Inc.
 */

var assert = require('assert-plus');
var minimatch = require('minimatch');
var cueball = require('cueball');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

module.exports = MockRedis;

function MockRedis(db) {
	this.db = db || {};
	EventEmitter.call(this);
}
util.inherits(MockRedis, EventEmitter);
MockRedis.createPool = function () {
	var db = {};
	var res = cueball.resolverForIpOrDomain({ input: '127.0.0.1:6379' });
	var pool = new cueball.ConnectionPool({
		domain: 'localhost',
		resolver: res,
		service: '_redis._tcp',
		defaultPort: 6379,
		spares: 4,
		maximum: 100,
		recovery: {
			default: {
				timeout: 100,
				retries: 1,
				delay: 0
			}
		},
		constructor: function (backend) {
			var c = new MockRedis(db);
			setImmediate(function () {
				c.emit('connect');
			});
			c.destroy = function () {
				c.emit('end');
			};
			c.unref = function () {};
			c.ref = function () {};
			return (c);
		}
	});
	res.start();
	return (pool);
};
MockRedis.prototype.keys = function (filter, cb) {
	var keys = Object.keys(this.db).filter(function (k) {
		return (minimatch(k, filter));
	});
	cb(null, keys);
};
MockRedis.prototype.get = function (key, cb) {
	assert.string(key, 'key');
	assert.func(cb, 'callback');
	if (this.db[key] === undefined) {
		cb(null, null);
		return;
	}
	if (typeof (this.db[key]) !== 'string') {
		cb(new TypeError('key is not a string'));
		return;
	}
	cb(null, this.db[key]);
};
MockRedis.prototype.set = function (key, val, cb) {
	assert.string(key, 'key');
	assert.optionalFunc(cb, 'callback');
	assert.string(val, 'value');
	this.db[key] = val;
	cb(null);
};
MockRedis.prototype.hget = function (key, quay, cb) {
	assert.string(key, 'key');
	assert.string(quay, 'quay');
	var val = null;
	if (typeof (this.db[key]) === 'object') {
		if (this.db[key][quay] !== undefined)
			val = this.db[key][quay];
	}
	cb(null, val);
};
MockRedis.prototype.hset = function (key, quay, val, cb) {
	assert.string(key, 'key');
	assert.string(quay, 'quay');
	assert.string(val, 'val');
	assert.optionalFunc(cb, 'callback');

	var v = this.db[key];
	if (v === undefined)
		v = {};
	if (typeof (v) !== 'object') {
		if (cb)
			cb(new TypeError('key is not a hash'));
		return;
	}
	v[quay] = val;
	this.db[key] = v;
	if (cb)
		cb(null);
};
MockRedis.prototype.lrange = function (key, from, to, cb) {
	assert.string(key, 'key');
	assert.number(from, 'from');
	assert.number(to, 'to');
	assert.func(cb, 'callback');
	var v = this.db[key];
	if (v === undefined)
		v = [];
	if (!Array.isArray(v)) {
		cb(new TypeError('key is not an array'));
		return;
	}
	if (to >= v.length || to === -1)
		to = undefined;
	v = v.slice(from, to);
	cb(null, v);
};
MockRedis.prototype.lpush = function () {
	var args = Array.prototype.slice.call(arguments);
	var key = args.shift();
	assert.string(key, 'key');
	var cb = args.pop();
	if (typeof (cb) !== 'function') {
		assert.string(cb);
		args.push(cb);
		cb = undefined;
	}
	assert.arrayOfString(args);
	var val = this.db[key];
	if (val === undefined)
		val = [];
	if (!Array.isArray(val)) {
		if (cb)
			cb(new TypeError('key is not an array'));
		return;
	}
	val = args.concat(val);
	this.db[key] = val;
	if (cb)
		cb(null);
};
MockRedis.prototype.rpush = function () {
	var args = Array.prototype.slice.call(arguments);
	var key = args.shift();
	assert.string(key, 'key');
	var cb = args.pop();
	if (typeof (cb) !== 'function') {
		assert.string(cb);
		args.push(cb);
		cb = undefined;
	}
	assert.arrayOfString(args);
	var val = this.db[key];
	if (val === undefined)
		val = [];
	if (!Array.isArray(val)) {
		if (cb)
			cb(new TypeError('key is not an array'));
		return;
	}
	val = val.concat(args);
	this.db[key] = val;
	if (cb)
		cb(null);
};
MockRedis.prototype.ltrim = function (key, min, max, cb) {
	assert.string(key, 'key');
	assert.number(min, 'min index');
	assert.number(max, 'max index');
	var val = this.db[key];
	if (val === undefined)
		val = [];
	if (!Array.isArray(val)) {
		if (cb)
			cb(new TypeError('key is not an array'));
		return;
	}
	val = val.slice(min, max);
	this.db[key] = val;
	if (cb)
		cb(null);
};
