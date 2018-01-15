
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
 * - redis: redist client to write cache responses to (instead of memory)
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
	const requestAsideId = md5(JSON.stringify(cacheableOptions));
	options.requestAsideId = requestAsideId;

	// record cache time
	if (options.cache && _.isNumber(options.cache)) {
		options.requestAsideCache = parseInt(options.cache, 10);
		delete options.cache;
	}

	// record redis client
	if (options.requestAsideId && options.redis && _.isObject(options.redis)) {
		options.requestAsideRedis = options.redis;
		delete options.redis;

		// retrieve from redis (if applicable)
		if (options.requestAsideReds) {
			// @todo
			console.warn('redis is not yet implemented');
		}
	}

	// retrieve from memory (if applicable)
	if (options.requestAsideId) {
		const result = requestAsideMemory[options.requestAsideId];
		if (result) {
			callback(result.err, result.res, result.body);
			deferred.resolve(result.body);
			return;
		}
	}

	// perform request
	// console.log('request options', options);
	request(options, (err, res, body) => {
		if (!err && res.statusCode === 200) {
			if (options.requestAsideId) {
				if (options.requestAsideRedis) {
					// store in redis
					console.warn('redis is not yet implemented');
				} else if (options.requestAsideCache) {
					// store in memory
					// console.log('stored', options.requestAsideId, options.requestAsideCache, options.uri);
					requestAsideMemory[options.requestAsideId] = {
						requestAsideId: options.requestAsideId,
						requestAsideCache: options.requestAsideCache,
						err: err,
						res: res,
						body: body
					};

					// self expire
					setTimeout(() => {
						delete requestAsideMemory[options.requestAsideId];
						// console.log('deleted', options.requestAsideId, options.requestAsideCache, options.uri);
					}, options.requestAsideCache);
				} else {
					// console.log('no cache', options.requestAsideId, options.requestAsideCache, options.uri);
				}
			}
			deferred.resolve(body);
		} else {
			deferred.reject(err || new Error(`Invalid status code: ${res.statusCode}`));
		}
		callback(err, res, body);
	});

	return deferred.promise;
};

