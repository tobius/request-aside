
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

```javascript
var request = require('request-aside');

// request
request(url);

// request and cache
request({
	method: 'GET',
	url: url,
	cache: 60 * 60 * 1000 // cache for 1 hour
});

// request and renew (overrides `cache` param if present)
request({
	method: 'GET',
	url: url,
	renew: 60 * 60 * 1000 // renew every 1 hour
});
```

## License

[MIT](https://github.com/tobius/request-aside/blob/master/LICENSE)

