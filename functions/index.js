const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");

const app = express();

// Automatically allow cross-origin requests
app.use(cors({origin: true}));

// Define a simple route
// app.get("/hello", (req, res) => {
//   res.send("Hello from Firebase!");
// });

// // Expose Express API as a single Cloud Function
// exports.api = functions.https.onRequest(app);

const admin = require("firebase-admin");
admin.initializeApp();


exports.sendVoteNotification = functions.firestore
    .document("polls/{pollId}")
    .onUpdate(async (change, context) => {
        const newValue = change.after.data();
        const previousValue = change.before.data();

        console.log("New value:", JSON.stringify(newValue));
        console.log("Previous value:", JSON.stringify(previousValue));
        
        // Find the poll option that got a new vote
        const updatedOption = newValue.pollOptions.find((option, index) => {
            const prevOption = previousValue.pollOptions[index];
            return Object.keys(option.votes).length > Object.keys(prevOption.votes).length;
        });
        
        if (updatedOption) {
            const pollOptionUserId = updatedOption.userId;
            const newVoteId = Object.keys(updatedOption.votes).find(key => 
                !previousValue.pollOptions.find(o => o.id === updatedOption.id).votes[key]
            );

            console.log("newVoteId", newVoteId);
            console.log("pollOptionUserId", pollOptionUserId);

            const userDoc = await admin.firestore().collection("users").doc(pollOptionUserId).get();
            console.log("pollOptionUserId****************************************************", pollOptionUserId);
            const userToken = userDoc.data().fcmToken;
            console.log("userToken****************************************************", userToken);
            
            const votedByUserDoc = await admin.firestore().collection("users").doc(newVoteId).get();
            const votedByUsername = votedByUserDoc.data().firstName;
                     
            const imageUrl = "https://play-lh.googleusercontent.com/ZcYo7MXo6XuUzjbTPOE0Dz6p25QqB6mmkpYn0WNB8odFlVkpHrpozYENhUbFpcrSrGw";

            const message = {
                notification: {
                    title: "New Vote!",
                    body: `${votedByUsername} voted for you in a poll`,
                    imageUrl: imageUrl
                },
                android: {
                  notification: {
                    imageUrl: imageUrl
                  }
                },
                apns: {
                  payload: {
                    aps: {
                      'mutable-content': 1
                    }
                  },
                  fcm_options: {
                    image: imageUrl
                  }
                },
                webpush: {
                  headers: {
                    image: imageUrl
                  }
                },
                token: ownerToken
              };
              
              console.log("Sending message:", JSON.stringify(message));
            
            try {
                await admin.messaging().send(message);
                console.log("Message sent successfully");
            } catch (error) {
                console.log("Error sending message:", error);
            }
        }
    });