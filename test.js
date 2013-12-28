var panlex = require('./index');

panlex.query('/lv', { limit: 1000 }, function (err, data) {
  if (err) console.log(err);
  else console.log(data);
});