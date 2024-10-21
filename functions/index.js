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

exports.sendFriendNotification = functions.firestore
    .document("users/{userId}")
    .onUpdate(async (change, context) => {
        console.log("sendFriendNotification function triggered");
        
        const newValue = change.after.data();
        const previousValue = change.before.data();

        console.log("New value:", JSON.stringify(newValue));
        console.log("Previous value:", JSON.stringify(previousValue));
        
        try {
            // Check if friendRequests exists and is an object
            if (typeof newValue.friendRequests !== 'object' || typeof previousValue.friendRequests !== 'object') {
                console.log("friendRequests is not an object in new or previous value");
                return;
            }

            const newFriendRequestsCount = Object.keys(newValue.friendRequests).length;
            const previousFriendRequestsCount = Object.keys(previousValue.friendRequests).length;

            console.log("New friend requests count:", newFriendRequestsCount);
            console.log("Previous friend requests count:", previousFriendRequestsCount);

            if (newFriendRequestsCount > previousFriendRequestsCount) {
                console.log("New friend request detected");
                
                // Find the new friendRequest
                const newFriendRequestId = Object.keys(newValue.friendRequests).find(
                    id => !previousValue.friendRequests.hasOwnProperty(id)
                );

                console.log("New friend request ID:", newFriendRequestId);

                if (newFriendRequestId) {
                    const userDoc = await admin.firestore().collection("users").doc(context.params.userId).get();
                    if (!userDoc.exists) {
                        console.log("User document not found");
                        return;
                    }
                    const userToken = userDoc.data().fcmToken;
                    console.log("User FCM token:", userToken);

                    const friendDoc = await admin.firestore().collection("users").doc(newFriendRequestId).get();
                    if (!friendDoc.exists) {
                        console.log("Friend document not found");
                        return;
                    }
                    const requestName = friendDoc.data().firstName;
                    console.log("Friend name:", requestName);

                    const message = {
                        notification: {
                            title: `${requestName} wants to be friends`,
                            body: "Tap to view friend request"
                        },
                        token: userToken,
                    };

                    console.log("Sending message:", JSON.stringify(message));

                    const response = await admin.messaging().send(message);
                    console.log("Notification sent successfully:", response);
                } else {
                    console.log("New friend request ID not found");
                }
            } else {
                console.log("No new friend request detected");
            }
        } catch (error) {
            console.error("Error in sendFriendNotification:", error);
        }
    });

exports.isHighschoolStillLocked = functions.firestore
    .document("highschools/{highschoolId}")
    .onUpdate(async (change, context) => {
        const newValue = change.after.data();
        const previousValue = change.before.data();
        
        
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
            console.log("pollOptionUserId****************************************************", pollOptionUserId);
            const userToken = userDoc.data().fcmToken;
            console.log("userToken****************************************************", userToken, userDoc.data());
            
            const votedByUserDoc = await admin.firestore().collection("users").doc(newVoteId).get();
            console.log("votedByUserDoc****************************************************", votedByUserDoc.data());

            const votedbyGender = votedByUserDoc.data().gender;
            const votedbyGrade = votedByUserDoc.data().grade;

            const message = {
                notification: {
                    title: `A ${votedbyGender} from ${votedbyGrade} voted for you!`,
                    body: `Tap to see details`,
                    imageUrl: "https://play-lh.googleusercontent.com/ZcYo7MXo6XuUzjbTPOE0Dz6p25QqB6mmkpYn0WNB8odFlVkpHrpozYENhUbFpcrSrGw"
                },
                token: userToken,
            };
            
            try {
                await admin.messaging().send(message);
                console.log("Message sent successfully");
            } catch (error) {
                console.log("Error sending message:", error);
            }
        }
    });