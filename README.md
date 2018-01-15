
# request-aside

__NOTE: REDIS SUPPORT IS IN PROGRESS__

Apply the `cache-aside` pattern to the [`request`](https://www.npmjs.com/package/request) module _(e.g. add cache support)_.

## Install

```bash
[~] npm install request-aside
```

## Usage

__cache support__

```javascript
var request = require('request-aside');
request({
	method: 'GET',
	url: url,
	cache: 60 * 60 * 1000 // cache for 1 hour (ms)
}, cb);
```

__redis storage__

```javascript
var request = require('request-aside');
var client = redis.createClient();
request({
	method: 'GET',
	url: url,
	cache: 60 * 60 * 1000, // cache for 1 hour
	redis: client
}, cb);
```

## License

[MIT](https://github.com/tobius/request-aside/blob/master/LICENSE)

