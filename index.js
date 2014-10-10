var hyperquest = require('hyperquest');
var zlib = require('zlib');

var RateLimiter = require('limiter').RateLimiter;
var limiter = new RateLimiter(120, 'minute');
limiter.tokenBucket.bucketSize = 30;

var API_URL = process.env.PANLEX_API || 'http://api.panlex.org';

var panlex = module.exports = {
  setUserAgent: setUserAgent,
  query: query,
  queryAll: queryAll,
  limit: true
};

setUserAgent('Unknown application', '?');

function setUserAgent(appName, version) {
  panlex.userAgent = appName + '/' + version 
    + ' (Language=node.js/' + process.version
    + '; Client=panlex/' + require('./package.json').version
    + '; Platform=' + process.platform + ')';
}

function query(url, body, cb) {
  if (body instanceof Function) {
    cb = body;
    body = {};
  }
  
  url = url.match(/^\//) ? API_URL + url : url;
  
  if (panlex.limit) {
    limiter.removeTokens(1, function (err) {
      if (err) cb(err);
      else _query(url, body, cb);
    });
  }
  else _query(url, body, cb);
}

function queryAll(url, body, cb) {
  if (body instanceof Function) {
    cb = body;
    body = {};
  }

  var bodyCopy = {};
  for (var i in body) bodyCopy[i] = body[i];
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

function _query(url, body, cb) {
  var req = hyperquest.post({
      uri: url,
      headers: { 
        'Content-type': 'application/json', 
        'Accept-encoding': 'gzip',
        'User-agent': panlex.userAgent
      }
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

  req.write(JSON.stringify(body || {}));
  req.end();  
}
