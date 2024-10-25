const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");

const app = express();

// Automatically allow cross-origin requests
app.use(cors({origin: true}));


const admin = require("firebase-admin");
admin.initializeApp();

async function sendNotification(token, title, body) {
    const message = {
        notification: { title, body },
        token: token,
    };

    console.log("Sending message:", JSON.stringify(message));

    try {
        const response = await admin.messaging().send(message);
        console.log("Notification sent successfully:", response);
    } catch (error) {
        console.error("Error sending notification:", error);
    }
}

const USERS_COLLECTION = "_users";
const SCHOOLS_COLLECTION = "_schools";
const VOTES_COLLECTION = "_votes";

exports.sendFriendRequestNotification = functions.firestore
    .document(`${USERS_COLLECTION}/{userId}`)
    .onUpdate(async (change, context) => {
        console.log("sendFriendNotification function triggered");
        
        const newValue = change.after.data();
        const previousValue = change.before.data();

        console.log("New value:", JSON.stringify(newValue));
        console.log("Previous value:", JSON.stringify(previousValue));
        
        try {
            if (typeof newValue.incomingFriendRequests !== 'object' || typeof previousValue.incomingFriendRequests !== 'object') {
                console.log("incomingFriendRequests is not an object in new or previous value");
                return;
            }
        
            // Check for new friend request
            const newFriendRequestsCount = Object.keys(newValue.incomingFriendRequests).length;
            const previousFriendRequestsCount = Object.keys(previousValue.incomingFriendRequests).length;
        
            if (newFriendRequestsCount > previousFriendRequestsCount) {
                console.log("New friend request detected");
                
                const newFriendRequestId = Object.keys(newValue.incomingFriendRequests).find(
                    id => !previousValue.incomingFriendRequests.hasOwnProperty(id)
                );
        
                console.log("New friend request ID:", newFriendRequestId);
        
                if (newFriendRequestId) {
                    const userDoc = await admin.firestore().collection(USERS_COLLECTION).doc(context.params.userId).get();
                    if (!userDoc.exists) {
                        console.log("User document not found");
                        return;
                    }
                    const userToken = userDoc.data().fcmToken;
        
                    const friendDoc = await admin.firestore().collection(USERS_COLLECTION).doc(newFriendRequestId).get();
                    if (!friendDoc.exists) {
                        console.log("Friend document not found");
                        return;
                    }
                    const requestName = friendDoc.data().firstName;
        
                    await sendNotification(userToken, `${requestName} wants to be friends`, "Tap to view friend request");
                }    
            }   

        } catch (error) {
            console.error("Error in sendFriendNotification:", error);
        }
    });


exports.acceptFriendRequestNotification = functions.firestore
    .document(`${USERS_COLLECTION}/{userId}`)
    .onUpdate(async (change, context) => {
        console.log("acceptFriendRequestNotification function triggered");
        
        const newValue = change.after.data();
        const previousValue = change.before.data();
        
        try {
            if (typeof newValue.friends !== 'object' || typeof previousValue.friends !== 'object') {
                console.log("friends is not an object in new or previous value");
                return;
            }
        
            const newFriendsCount = Object.keys(newValue.friends).length;
            const previousFriendsCount = Object.keys(previousValue.friends).length;
        
            if (newFriendsCount > previousFriendsCount) {
                console.log("New friend detected (friend request accepted)");
            
                const newFriendId = Object.keys(newValue.friends).find(
                    id => !previousValue.friends.hasOwnProperty(id)
                );
            
                console.log("New friend ID:", newFriendId);
            
                if (newFriendId) {
                    const friendDoc = await admin.firestore().collection(USERS_COLLECTION).doc(newFriendId).get();
                    if (!friendDoc.exists) {
                        console.log("Friend document not found");
                        return;
                    }
                    const friendToken = friendDoc.data().fcmToken;
                    const userName = newValue.firstName;
            
                    await sendNotification(friendToken, `${userName} accepted your friend request`, "You are now friends!");
                }
            }

        } catch (error) {
            console.error("Error in sendFriendNotification:", error);
        }
    });




exports.schoolUnlockNotification = functions.firestore
    .document(`${SCHOOLS_COLLECTION}/{schoolId}`)
    .onUpdate(async (change, context) => {
        const newValue = change.after.data();
        const previousValue = change.before.data();
        
        console.log("schoolUnlockNotification function triggered");

        // if there are >= 14 students in the school, send a notification to all users in the school
        if (newValue.studentCount >= 14) {
            console.log("School has >= 14 students, sending notification to all users in the school");

            const schoolUsers = await admin.firestore().collection(USERS_COLLECTION).where("schoolId", "==", context.params.schoolId).get();
            const userTokens = schoolUsers.docs.map(doc => doc.data().fcmToken);

            await sendNotification(userTokens, "Your school is now unlocked!", "Tap to start voting");
        }
    });

exports.sendVoteNotification = functions.firestore
    .document(`${VOTES_COLLECTION}/{voteId}`)
    .onUpdate(async (change, context) => {
        const newValue = change.after.data();
        const previousValue = change.before.data();

        console.log("sendVoteNotification function triggered");

        const userDoc = await admin.firestore().collection(USERS_COLLECTION).doc(newValue.votedForId).get();
        const userToken = userDoc.data().fcmToken;

        const votedByUserDoc = await admin.firestore().collection(USERS_COLLECTION).doc(newValue.voterId).get();
        const votedByGender = votedByUserDoc.data().gender;
        const votedByGrade = votedByUserDoc.data().grade;

        await sendNotification(
            userToken,
            `A ${votedByGender} from ${votedByGrade} voted for you!`,
            "Tap to see what the question was"
        );
    });
