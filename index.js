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

                //Notifications
                if((queue[userInQueue] -1) == 2){
                  //If next in queue
                  //Send notification
                  notify(userInQueue, "You are next in queue!");
                }else if((queue[userInQueue] -1) == 1){
                  //It is your time
                  //Send notification
                  notify(userInQueue, "Now it your time!");
                }else if((queue[userInQueue] -1) == 11){
                  //There are now 10 people in front of you
                  //Send notification
                  notify(userInQueue, "There are now 10 people in front of you in the queue");
                }else if((queue[userInQueue] -1) == 21){
                  //There are now 10 people in front of you
                  //Send notification
                  notify(userInQueue, "There are now 20 people in front of you in the queue");
                }

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
              //Send notification
              notify(userInQueue, "You are next in queue!");
            }else if((queue[userInQueue] -1) == 1){
              //It is your time
              //Send notification
              notify(userInQueue, "Now it your time!");
            }else if((queue[userInQueue] -1) == 11){
              //There are now 10 people in front of you
              //Send notification
              notify(userInQueue, "There are now 10 people in front of you in the queue");
            }else if((queue[userInQueue] -1) == 21){
              //There are now 10 people in front of you
              //Send notification
              notify(userInQueue, "There are now 20 people in front of you in the queue");
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

app.post('/webhook', function (req, res) {
  var data = req.body;
  if (data.object == 'page') {
    data.entry.forEach(function(pageEntry) {
      var pageID = pageEntry.id;
      var timeOfEvent = pageEntry.time;

      pageEntry.messaging.forEach(function(messagingEvent) {
        if (messagingEvent.optin) {
          receivedAuthentication(messagingEvent);
        } else if (messagingEvent.message) {
          receivedMessage(messagingEvent);
        } else if (messagingEvent.delivery) {
          receivedDeliveryConfirmation(messagingEvent);
        } else if (messagingEvent.postback) {
          receivedPostback(messagingEvent);
        } else {
          console.log("Webhook received unknown messagingEvent: ", messagingEvent);
        }
      });
    });

    res.sendStatus(200);
  }
});
function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:",
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var messageId = message.mid;

  // You may get a text or attachment but not both
  var messageText = message.text;
  var messageAttachments = message.attachments;

  if (messageText) {
    switch (messageText) {
      case 'image':
        sendImageMessage(senderID);
        break;

      case 'button':
        sendButtonMessage(senderID);
        break;

      case 'generic':
        sendGenericMessage(senderID);
        break;

      case 'receipt':
        sendReceiptMessage(senderID);
        break;

      default:
        sendTextMessage(senderID, messageText);
    }
  } else if (messageAttachments) {
    sendTextMessage(senderID, "Message with attachment received");
  }
}
function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData);
}
function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: "EAAG3xPE4ZA6MBAI0sQWNdS2jpErB0LelEpne1ZCslwIfClmGZCPNsptprrwdV3iSsGCBHvctBxocrs0HfLy8eCsUXMgfThZCZByIC6dgUQPzFlmHFKBJUaVlKkpTaOf7ugoJq5Jyzm8hVBZBkkhSZBrfJQntxS2T4O2DzrIvdKoawZDZD" },
    method: 'POST',
    json: messageData
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s",
        messageId, recipientId);
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  });
}

function notify(uid, text){
  //TODO
}

/*
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
