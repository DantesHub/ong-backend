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

exports.sendLikeNotification = functions.firestore
    .document("polls/{pollId}")
    .onUpdate(async (change, context) => {
        const newValue = change.after.data();
        const previousValue = change.before.data();
        
        // Check if likes arrays exist and have length property
        const newLikes = newValue.likes || [];
        const previousLikes = previousValue.likes || [];
        
        if (newLikes.length > previousLikes.length) {
            const ownerId = newValue.ownerId;
            const likedByUser = newLikes[newLikes.length - 1];
            
            // Fetch owner document
            const ownerDoc = await admin.firestore().collection("users").doc(ownerId).get();
            if (!ownerDoc.exists) {
                console.log("Owner document not found");
                return;
            }
            const ownerToken = ownerDoc.data().fcmToken;
            
            // Fetch likedByUser document
            const likedByUserDoc = await admin.firestore().collection("users").doc(likedByUser).get();
            if (!likedByUserDoc.exists) {
                console.log("Liked by user document not found");
                return;
            }
            const likedByUsername = likedByUserDoc.data().username;
            
            const message = {
                notification: {
                    title: "New Like!",
                    body: `${likedByUsername} liked your photo`
                },
                token: ownerToken
            };
            
            try {
                await admin.messaging().send(message);
            } catch (error) {
                console.log("Error sending message:", error);
            }
        }
    });

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
            const userToken = userDoc.data().fcmToken;
            
            const votedByUserDoc = await admin.firestore().collection("users").doc(newVoteId).get();
            const votedByUsername = votedByUserDoc.data().username;
            
            const message = {
                notification: {
                    title: "New Vote!",
                    body: `${votedByUsername} voted for your poll option`,
                },
                token: userToken,
            };
            
            try {
                await admin.messaging().send(message);
            } catch (error) {
                console.log("Error sending message:", error);
            }
        }
    });