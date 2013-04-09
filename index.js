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
    if (res.statusCode != 200) 
      return cb(new Error('PanLex API returned HTTP status code ' + res.statusCode));
    
    if (res.headers['content-encoding'] === 'gzip')
      res = res.pipe(zlib.createGunzip());      
    
    var body = '';
    res.on('data', function (chunk) {
      body += chunk;
    });
    res.on('end', function () {
      body = JSON.parse(body);
      if (body.status === 'error') cb(new Error('PanLex API returned error: ' + body.error));
      else cb(null, body);      
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
      if (err) cb(err);
      
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