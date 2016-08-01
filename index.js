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
    //data = {uid, queue}

    //1. Remove uid from queue in the database
    firebase.database().ref('queue/'+data.queue+'/queue').on('value', function(snapshot) {
      var queue = snapshot.val();
      var newQueue = {};
      for (var userInQueue in queue) {
        if (queue.hasOwnProperty(userInQueue)) {
          if(userInQueue != data.uid){
            if(queue[userInQueue] == 0){
              //This is 0 user (it must stay)
              newQueue[userInQueue] = 0;
            }else{
              if(queue[userInQueue] > queue[data.uid]){
                newQueue[userInQueue] = queue[userInQueue] - 1;
                //2. Inform user to move 1 place forward
                socket.emit(data.queue, { uid: userInQueue, do: 'moveFroward'});
              }
            }
          }else{
            //Do not add this to new queue, cause this is the user which wanted to leave
          }
        }
      }
      console.log("Old queue");
      console.log(queue);
      console.log("New queue");
      console.log(newQueue);
      database.ref('queue/'+data.queue+'/queue').set(newQueue);
    });
  });
  socket.on('join', function(data){
    //Someone wants to join the queue
    //data = {uid, queue}
  });
  socket.on('nextCustomer', function(data){
    //Queue manager clicked 'Next customer' button
    //data = {queue}
    //1. Revove first user from the queue
    firebase.database().ref('queue/'+data.queue+'/queue').on('value', function(snapshot) {
      var queue = snapshot.val();
      var newQueue = {};
      for (var userInQueue in queue) {
        if (queue.hasOwnProperty(userInQueue)) {
          if (queue[userInQueue] == 1) {
            //This user must removed from the queue
            socket.emit(data.queue, { uid: userInQueue, do: 'removeFromQueue'});
          }else if (queue[userInQueue] == 0) {
            //This is 0 user (it must stay)
            newQueue[userInQueue] = 0;
          }else{
            newQueue[userInQueue] = queue[userInQueue] - 1;
            socket.emit(data.queue, { uid: userInQueue, do: 'moveFroward'});
          }
        }
      }
      console.log("Old queue");
      console.log(queue);
      console.log("New queue");
      console.log(newQueue);
      database.ref('queue/'+data.queue+'/queue').set(newQueue);
    });
  })
});
