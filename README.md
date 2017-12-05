
# request-aside

__NOTE: ONLY RECENLTY REVIVED, NOT READY FOR USE YET__

A Node.js module that makes request calls, caches them, and queues them for renewal.

_Note: This module extends [`request`](https://www.npmjs.com/package/request)._

## Install

Install via NPM.

```bash
[~] npm install request-aside
```

## Usage

__Request (without cache)__

```javascript
var request = require('request-aside');
request(url, cb);
```

__Request and cache__

```javascript
var request = require('request-aside');
request({
	method: 'GET',
	url: url,
	cache: 60 * 60 * 1000 // cache for 1 hour
}, cb);
```

__Request and renew (overrides `cache`)__

```javascript
var request = require('request-aside');
request({
	method: 'GET',
	url: url,
	renew: 60 * 60 * 1000 // renew every 1 hour
}, cb);
```

__Request and cache (or renew) in Redis instead of memory__

```javascript
var request = require('request-aside');
var client = redis.createClient();
request({
	method: 'GET',
	url: url,
	cache: 60 * 60 * 1000, // cache for 1 hour
	redis: client
});
```

## License

[MIT](https://github.com/tobius/request-aside/blob/master/LICENSE)

