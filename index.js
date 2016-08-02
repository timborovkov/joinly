var express = require('express');
var app = express();
var path = require('path');
var server = require('http').Server(app);
var io = require('socket.io')(server);
var firebase = require('firebase');
var request = require('request');

var port = process.env.PORT || 3000;
server.listen(port);

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

//Sign in to Firebase server user account
//This account has access to everything in database
firebase.auth().signInWithEmailAndPassword('server@joinly.org', 'yD4e4SmTWnv7Gjc').catch(function(error) {
  // Handle Errors here.
  var errorCode = error.code;
  var errorMessage = error.message;
});

io.on('connection', function (socket) {
  console.log('user has been connected');
  socket.on('leave', function(data){
    //Someone wants to leave the queue
    //data = {uid, queue}

    //1. Remove uid from queue in the database
    database.ref('queue/'+data.queue+'/queue').on('value', function(snapshot) {
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
            database.ref('user/'+userInQueue+'/ongoingQueue').set(null);
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
    database.ref('queue/'+data.queue+'/queue').on('value', function(snapshot) {
      var queue = snapshot.val();
      var newQueue = {};
      for (var userInQueue in queue) {
        if (queue.hasOwnProperty(userInQueue)) {
          if (queue[userInQueue] == 1) {
            //This user must removed from the queue
            socket.emit(data.queue, { uid: userInQueue, do: 'removeFromQueue'});
            database.ref('user/'+userInQueue+'/ongoingQueue').set(null);
          }else if (queue[userInQueue] == 0) {
            //This is 0 user (it must stay)
            newQueue[userInQueue] = 0;
          }else{
            newQueue[userInQueue] = queue[userInQueue] - 1;

            if((queue[userInQueue] -1) == 2){
              //If next in queue
              //Get user notification token
              database.ref('user/'+userInQueue+'/notificationToken').on('value', function(snapshot){
                var notificationToken = snapshot.val();
                //Send notification
                request.post('https://push.ionic.io/api/v1/push', {
                  form:{
                    tokens:[
                      notificationToken
                    ],
                    "notification": {
                      "alert":"You are next in the queue!"
                    }
                  }
                });
              });
            }else if(){
              //It is your time
              //Send notification
            }
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

/*
app.get('/webhook', function(req, res){
  if (req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === "thisIsEpic") {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);
  }
});
app.get('/notify', function(req, res) {
  var uid = req.query.uid;

  database.ref('user/'+uid+'/notificationToken').on('value', function(snapshot){
    var notificationToken = snapshot.val();
    //Send notification
    var reqOptions = {
      uri: 'https://push.ionic.io/api/v1/push',
      method: 'post',
      body: {
        tokens:[
          notificationToken
        ],
        "notification": {
          "alert":"You are next in the queue!"
        }
      },
      headers: {
        "Content-Type": "application/json",
        "X-Ionic-Application-Id": "345820ce",
        "Authorization": "".replace("\n", "")
      }
    }
    request(reqOptions, function(error, response, body){
      if (!error && response.statusCode == 200) {
        console.log(body);
      }else{
        console.log(response);
        console.error(error);
      }
    });
  });
});
*/
