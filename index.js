var request = require('request');

var API_URL = 'http://if4.panlex.org/api';

function query(url, body, cb) {
  if (body instanceof Function) {
    cb = body;
    body = {};
  }
  
  url = url.match(/^\//) ? API_URL + url : url;
  body = body || {};
  
  request({ url: url, json: body, method: 'POST' },
    function (err, res, body) {
      if (err) cb(err);
      else if (res.statusCode != 200) 
        cb(new Error('PanLex API returned HTTP status code ' + res.statusCode));
      else {
        if (body.status === 'error') cb(new Error('PanLex API returned error: ' + body.error));
        cb(null, body);
      }
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
        result.result.push(thisResult.result);
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