
# request-aside

Apply the `cache-aside` pattern to the [`request`](https://www.npmjs.com/package/request) module _(e.g. add cache support)_.

## Install

```bash
[~] npm install request-aside
```

## Usage

__memory cache__

```javascript
var request = require('request-aside');
request({
	method: 'GET',
	url: url,
	cache: 60 * 60 * 1000 // cache for 1 hour
}, cb);
```

__redis cache__

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

__promises__

```javascript
var request = require('request-aside');
var client = redis.createClient();
request({
	method: 'GET',
	url: url,
	cache: 60 * 60 * 1000, // cache for 1 hour
	redis: client
}).then(console.log).catch(console.error);
```

## License

[MIT](https://github.com/tobius/request-aside/blob/master/LICENSE)

