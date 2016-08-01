var express = require('express');
var app = express();
var path = require('path');
var server = require('http').Server(app);
var io = require('socket.io')(server);
var firebase = require('firebase');

server.listen(process.env.PORT || 5000);

app.use("/", express.static(path.join(__dirname, 'site')));

// Initialize Firebase
var config = {
  apiKey: "AIzaSyB2lOxZibc3G8JyuOU_2ixzRijZaR_7R6s",
  authDomain: "joinapp-28d70.firebaseapp.com",
  databaseURL: "https://joinapp-28d70.firebaseio.com",
  storageBucket: "joinapp-28d70.appspot.com",
};
firebase.initializeApp(config);
var database = firebase.database();

io.on('connection', function (socket) {
  console.log('user has been connected');
  socket.on('leave', function(data){
    //Someone wants to leave the queue
    //data = {uid, queueId}

    //1. Remove uid from queue in the database
    //TODO
    //2. Inform others that they moved 1 place forward
    socket.emit('queue', { my: 'data' });
  });
  socket.on('join', function(data){

  });
  socket.on('nextCustomer', function(data){

  })
});
