
// import
const
	_ = require('lodash'),
	md5 = require('md5'),
	q = require('q'),
	request = require('request');

// in-memory storage
let requestAsideMemory = {};

/**
 * request module proxy
 *
 * additionally supported properties:
 * - cache: number of milliseconds to cache response for followup requests
 * - redis: redis client to write cache responses to (instead of memory)
 *
 * @param {Mixed} uri or options (custom params only work with options)
 * @param {Function} [callback(err, res, body)]
 * @return {Promise}
 */
module.exports = (options, callback = () => {}) => {

	let deferred = q.defer();

	// convert uri to options format
	if (_.isString(options)) {
		options = {
			uri: options
		};
	}

	// fix common mis-spelling
	if (options.url) {
		options.uri = options.url;
		delete options.url;
	}

	// record identity
	let cacheableOptions = _.clone(options);
	delete cacheableOptions.cache;
	delete cacheableOptions.redis;
	const requestAsideId = `request-aside/${md5(JSON.stringify(cacheableOptions))}`;
	options.requestAsideId = requestAsideId;

	// record cache time
	if (options.cache && _.isNumber(options.cache)) {
		options.requestAsideCache = parseInt(options.cache, 10);
		delete options.cache;
	}

	// record redis client
	if (options.redis && _.isObject(options.redis)) {
		options.requestAsideRedis = options.redis;
		delete options.redis;
	}

	const fetch = (options) => {

		// perform request
		request(options, (err, res, body) => {
			if (!err && res.statusCode === 200) {

				const requestAsideObject = {
					requestAsideId: options.requestAsideId,
					requestAsideCache: options.requestAsideCache,
					err: err,
					res: res,
					body: body
				};
				res.headers['X-Request-Aside-Id'] = options.requestAsideId;
				res.headers['X-Request-Aside-Source'] = 'internet';

				if (options.requestAsideRedis) {

					// store in redis and self expire
					const requestAsideString = JSON.stringify(requestAsideObject);
					options.requestAsideRedis.set(options.requestAsideId, requestAsideString, 'PX', options.requestAsideCache);

				} else if (options.requestAsideCache) {

					// store in memory and self expire
					requestAsideMemory[options.requestAsideId] = _.clone(requestAsideObject);
					setTimeout(() => {
						delete requestAsideMemory[options.requestAsideId];
					}, options.requestAsideCache);

				}
				deferred.resolve(body);
			} else {
				err = err || new Error(`Invalid status code: ${res.statusCode}`);
				deferred.reject(err);
			}
			callback(err, res, body);
		});

	};

	if (options.requestAsideRedis) {

		// retrieve from redis
		options.requestAsideRedis.get(options.requestAsideId, (err, obj) => {
			if (err) {
				deferred.reject(err);
				callback(err);
				return deferred.promise;
			}
			if (obj) {
				obj = JSON.parse(obj);
				if (!obj.body) {
					err = new Error('Failed to parse stored request');
					deferred.reject(err);
					callback(err);
				} else {
					obj.res.headers['X-Request-Aside-Source'] = 'redis';
					deferred.resolve(obj.body);
					callback(null, obj.res, obj.body);
				}
				return deferred.promise;
			} else {
				fetch(options);
			}
		});

	} else if (options.requestAsideCache) {

		// retrieve from memory
		const result = requestAsideMemory[options.requestAsideId];
		if (result) {
			result.res.headers['X-Request-Aside-Source'] = 'memory';
			callback(result.err, result.res, result.body);
			deferred.resolve(result.body);
			return deferred.promise;
		} else {
			fetch(options);
		}

	} else {

		// retrieve from internet
		fetch(options);
	}

	return deferred.promise;
};

