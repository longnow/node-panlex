This module provides convenience methods to access the [PanLex API](http://dev.panlex.org/api/).

    var panlex = require('panlex');
    
    // do a single request
    panlex.query('/lv', {}, function (err, result) { ... });
    
    // loop until all results are received
    panlex.queryAll('/lv', {}, function (err, result) { ... });
    
    // turn off built-in rate limiting (on by default)
    panlex.limit = false;