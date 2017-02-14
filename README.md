This module provides convenience methods to access the [PanLex API](https://dev.panlex.org/api/).

    var panlex = require('panlex');

    // use API v1 endpoint (default is v2)
    panlex.version(1);

    // set User-Agent header with app name and version
    panlex.setUserAgent('My application', '0.0.3');

    // turn off built-in rate limiting (careful!)
    panlex.limit = false;

Callback style:

    // do a single request
    panlex.query('/lv', {}, function (err, data) { ... });

    // loop until all results are received
    panlex.queryAll('/lv', {}, function (err, data) { ... });

Stream style:

    // do a single request
    panlex.queryStream('/lv', {})
      .on('data', function (lv) { ... }) // single lv object
      .on('error', function (err) { ... })
      .on('end', function () { ... });

    // loop until all results are received
    panlex.queryStreamAll('/lv', {})
      .on('data', function (lv) { ... }) // single lv object
      .on('error', function (err) { ... })
      .on('end', function () { ... });
