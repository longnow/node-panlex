var request = require('request');
var zlib = require('zlib');

var API_URL = process.env.PANLEX_API || 'http://api.panlex.org';

function query(url, body, cb) {
  if (body instanceof Function) {
    cb = body;
    body = {};
  }
  
  url = url.match(/^\//) ? API_URL + url : url;
      
  request({
      url: url,
      method: 'POST',
      body: JSON.stringify(body || {}),
      headers: { 'Content-type': 'application/json', 'Accept-encoding': 'gzip' }
  })
  .on('error', function (err) {
    cb(err);
  })
  .on('response', function (res) {
    var statusCode = res.statusCode;
    
    if (res.headers['content-encoding'] === 'gzip')
      res = res.pipe(zlib.createGunzip());      
    
    var body = '';

    res.on('data', function (chunk) {
      body += chunk;
    });
    
    res.on('end', function () {
      try {
        body = JSON.parse(body);        
      } catch (err) {
        return cb(new Error('PanLex API returned invalid JSON'), body);
      }
      
      var err = statusCode === 200
        ? null
        : new Error('PanLex API returned HTTP status code ' + statusCode);
      
      cb(err, body);
    });
  });
}

function queryAll(url, body, cb) {
  var bodyCopy = {};
  if (body) {
    for (var i in body) bodyCopy[i] = body[i];
  }  
  delete bodyCopy.limit;
  bodyCopy.offset = 0;
  
  var result;
  loop();
  
  function loop() {
    query(url, bodyCopy, function (err, thisResult) {
      if (err) return cb(err, thisResult);
      
      if (result) {
        Array.prototype.push.apply(result.result, thisResult.result);
        result.resultNum += thisResult.resultNum;
      } 
      else result = thisResult;
      
      if (thisResult.resultNum < thisResult.resultMax) cb(null, result);
      else {
        bodyCopy.offset += thisResult.resultNum;
        loop();
      }
    });
  }
}

module.exports = {
  query: query,
  queryAll: queryAll
};
