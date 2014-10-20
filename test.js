var panlex = require('./index');

panlex.queryStreamAll('/lv', { limit: 1000 })
.on('error', function (err) {
  console.log(err);
})
.on('data', function (obj) {
  console.log(obj);
})
.on('end', function () {
  console.log('done');
});

/*panlex.queryAll('/lv', {}, function (err, data) {
  console.log(data);
});*/