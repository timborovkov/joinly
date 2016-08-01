var express = require('express');
var app = express();
var io = require('socket.io')(app.get('port'));

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/site'));

io.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('disconnect', function () {
    console.log("user disconnected");
  });
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
