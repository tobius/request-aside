
# recache

A Node.js module for caching (and recaching) Request responses

## Install

Install via NPM.

```bash
[~] npm install recache
```

## Usage

Usage is very straight forward.

```javascript
// load module
var recache = require('recache');

// define request object
var uri = 'http://www.somedomain/something.whatever';

// define a handler
var handler = function(err, res, body, cached){
    if (!!err || (res && res.statusCode !== 200)){
        console.log('bad', err || 'Bad status code: ' + res.statusCode);
    } else {
        console.log('good', body);
    }
    if (cached){
        console.log('cached!');
    }
};

// normal request (no caching)
recache(uri, handler);

// request and cache for 1 minute (no recaching)
recache(uri, handler, 60 * 1000);

// request and cache for 1 minute and continue recaching for 1 hour
recache(uri, handler, 60 * 1000, 60 * 60 * 1000);

// request and cache for 500 ms and continue recaching for 2 minutes
recache(uri, handler, 500, 2 * 60 * 1000);
```

