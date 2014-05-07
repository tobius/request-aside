
var crypto = require('crypto'),
    request = require('request');

(function(){

    'use strict';

    var root = this;

    var recache = root.recache = {

        /**
         * cached responses
         * @var {Object}
         */
        _responses: {},

        /**
         * generate a unique hash
         * 
         * @param {String} salt
         * @return {String}
         */
        _generateUniqueHash: function(salt){
            return crypto.createHash('md5').update(salt).digest('hex');
        },

        /**
         * request a uri and time it
         *
         * @param {Object} req
         * @param {Function} callback(err, res, body, ms)
         */
        _timedRequest: function(req, callback){
            var start, stop;
            start = process.hrtime();
            request(req, function(err, res, body){
                stop = process.hrtime(start);
                callback(err, res, body, (stop[0] + (stop[1] / 1e9)) / 1000);
            });
        },

        /**
         * recache a tracked response
         *
         * @param {String} id
         */
        _recache: function(id){
            if (recache._responses[id] !== undefined){
                recache._timedRequest(recache._responses[id].req, function(err, res, body, ms){
                    recache._responses[id].err = err;
                    recache._responses[id].res = res;
                    recache._responses[id].body = body;
                    recache._responses[id].ms = ms;
                    recache._responses[id].recache = setTimeout(function(){ recache._recache(id); }, recache._responses[id].age - ms);
                });
            }
        },

        /**
         * expire a tracked response
         *
         * @param {String} id
         */
        _expire: function(id){
            if (recache._responses[id] !== undefined){
                clearTimeout(recache._responses[id].recache);
                clearTimeout(recache._responses[id].expire);
                delete recache._responses[id];
            }
        },

        /**
         * request a uri and cache/recache as needed
         *
         * @param {Object} req
         * @param {Function} callback(err, res, body, cached)
         * @param {Integer} [age] (default=0ms)
         * @param {Integer} [duration] (default=0ms)
         */
        _request: function(req, callback, age, duration){

            var id, cached = false, response;

            // ensure optional param values
            age      = age || 0;
            duration = duration || 0;

            // request identifier
            id = recache._generateUniqueHash(JSON.stringify(req));

            if (recache._responses[id] !== undefined){

                // from cache
                response = recache._responses[id];
                callback(response.err, response.res, response.body);

            } else {

                // from web
                recache._timedRequest(req, function(err, res, body, ms){

                    // only cache successes
                    if (!err && res && res.statusCode === 200 && body && ms){

                        // build response object
                        response = {
                            id       : id,
                            err      : err,
                            res      : res,
                            body     : body,
                            ms       : ms,
                            age      : age,
                            duration : duration,
                            recache  : null,
                            expire   : null
                        };

                        if (age > 0){

                            // recache in {age} milliseconds
                            response.recache = setTimeout(function(){ recache._recache(id); }, age - ms);

                            if (duration > age && duration > 0){

                                // expire in {duration} milliseconds
                                response._recache = setTimeout(function(){ recache._expire(id); }, duration);

                            }

                        }

                        // cache it
                        recache._responses[id] = response;
                        cached = true;

                    }

                    // pass through
                    callback(err, res, body, cached);
                    return;

                });

            }

        }

    };

    module.exports = function(req, callback, age, duration){
        recache._request(req, callback, age, duration);
    };

}).call(this);

