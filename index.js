var request = require('request');
var zlib = require('zlib');

var RateLimiter = require('limiter').RateLimiter;
var limiter = new RateLimiter(120, 'minute');
limiter.tokenBucket.bucketSize = 30;

var panlex = module.exports = {
  setUserAgent: setUserAgent,
  query: query,
  queryAll: queryAll,
  version: version,
  limit: true,
  endpoint: process.env.PANLEX_API || 'https://api.panlex.org/v2'
};

setUserAgent('Unknown application', '?');

function version(num) {
  if (process.env.PANLEX_API === undefined) {
    if (num === 1) panlex.endpoint = 'https://api.panlex.org';
    else panlex.endpoint = 'https://api.panlex.org/v' + num;
  }
}

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

  callWhenReady(_query, [url, body, cb]);
}

function _query(url, body, cb) {
  var req = createRequest(url, 'application/json')
  .on('error', cb)
  .on('response', function (res) {
    var err = getError(res);
    res = decode(res);

    var body = '';

    res.on('data', function (chunk) {
      body += chunk;
    });

    res.on('end', function () {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return cb(new Error('PanLex API returned invalid JSON'), body);
      }

      cb(err, body);
    });
  });

  writeBody(req, body);
}

function queryAll(url, body, method, cb) {
  if (body instanceof Function) {
    cb = body;
    body = {};
    method = 'offset';
  }

  if (method instanceof Function) {
    cb = method;
    method = 'offset';
  }

  body = copyBody(body);

  var loop, result;

  if (method === 'offset') {
    body.offset = body.offset || 0;

    loop = function loop() {
      query(url, body, function (err, thisResult) {
        if (err) return cb(err, thisResult);

        if (result) {
          Array.prototype.push.apply(result.result, thisResult.result);
          result.resultNum += thisResult.resultNum;
        }
        else result = thisResult;

        if (thisResult.resultNum < thisResult.resultMax) cb(null, result);
        else {
          body.offset += thisResult.resultNum;
          loop();
        }
      });
    };
  }
  else if (method === 'after') {
    checkAfterOffset(body);

    var afterParams = getAfterParams(url, body);

    loop = function loop() {
      query(url, body, function (err, thisResult) {
        if (err) return cb(err, thisResult);

        if (result) {
          Array.prototype.push.apply(result.result, thisResult.result);
          result.resultNum += thisResult.resultNum;
        }
        else result = thisResult;

        if (thisResult.resultNum < thisResult.resultMax) cb(null, result);
        else {
          body.after = getAfterValues(thisResult.result[thisResult.result.length - 1], afterParams);
          loop();
        }
      });
    };
  }
  else unknownMethodError();

  loop();
}

function callWhenReady(f, args) {
  if (panlex.limit) {
    limiter.removeTokens(1, function (err) {
      if (err) args[args.length - 1](err);
      else f.apply(null, args);
    });
  }
  else f.apply(null, args);
}

function createRequest(url, accept) {
  url = url.match(/^\//) ? panlex.endpoint + url : url;

  var headers = {
    'content-type': 'application/json',
    'accept-encoding': 'gzip',
    'user-agent': panlex.userAgent
  };

  if (accept) headers.accept = accept;

  return request.post({ uri: url, headers: headers });
}

function writeBody(req, body) {
  req.write(JSON.stringify(body || {}));
  req.end();
}

function getError(res) {
  return res.statusCode === 200
    ? null
    : new Error('PanLex API returned HTTP status code ' + res.statusCode);
}

function decode(res) {
  return res.headers['content-encoding'] === 'gzip'
    ? res.pipe(zlib.createGunzip())
    : res;
}

function copyBody(body) {
  var copy = {};
  for (var i in body) copy[i] = body[i];

  if (copy.limit !== undefined)
    throw 'the limit parameter is incompatible with queryAll and queryStreamAll';

  return copy;
}

function getAfterParams(url, body) {
  if (body.sort !== undefined) {
    var sort = body.sort;
    if (!(sort instanceof Array)) sort = [sort];

    return sort.map(function (item) { return item.replace(/ (?:asc|desc)$/gi, '') });
  }
  else {
    var match = url.match(/\/([a-z]+)$/);

    if (match) return [match[1]];

    throw 'could not automatically guess "after" field from URL: ' + url;
  }
}

function getAfterValues(last, afterParams) {
  return afterParams.map(function (item) { return last[item] });
}

function unknownMethodError() {
  throw 'unknown method: valid values are "offset" and "after"';
}

function checkAfterOffset(body) {
  if (body.offset !== undefined)
    throw 'the offset parameter is incompatible with the "after" method';
}
