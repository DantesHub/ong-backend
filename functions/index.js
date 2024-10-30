const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");

const app = express();

// Automatically allow cross-origin requests
app.use(cors({origin: true}));


const admin = require("firebase-admin");
admin.initializeApp();

async function sendNotification(token, title, body) {
    if (!token) {
        console.log("No valid FCM token provided. Skipping notification.");
        return;
    }

    const message = {
        notification: { title, body },
        token: token,
        apns: {
            payload: {
                aps: {
                    sound: 'default',
                }
            }
        }
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
const NOTIFICATIONS_COLLECTION = "_notifications";

exports.sendNotification = functions.firestore
    .document(`${NOTIFICATIONS_COLLECTION}/{notificationId}`)
    .onCreate(async (snapshot, context) => {
        console.log("New notification created:", context.params.notificationId);
        
        const notification = snapshot.data();
        
        try {
            // Get recipient's FCM token
            const recipientDoc = await admin.firestore()
                .collection(USERS_COLLECTION)
                .doc(notification.recipientId)
                .get();

            if (!recipientDoc.exists) {
                console.log("Recipient not found");
                return;
            }

            const recipientToken = recipientDoc.data().fcmToken;
            if (!recipientToken) {
                console.log("Recipient has no FCM token");
                return;
            }

            // Get sender's info for notifications that need it
            let senderName = "";
            let senderGender = "";
            let senderGrade = "";
            if (notification.senderId) {
                const senderDoc = await admin.firestore()
                    .collection(USERS_COLLECTION)
                    .doc(notification.senderId)
                    .get();
                
                if (senderDoc.exists) {
                    senderName = senderDoc.data().firstName || "Someone";
                    senderGender = senderDoc.data().gender || "unknown";
                    senderGrade = senderDoc.data().grade || "unknown";
                }
            }

            // Construct notification message based on type
            const message = await constructNotificationMessage(notification, senderName, senderGender, senderGrade);
            if (!message) {
                console.log("No message constructed for notification type:", notification.type);
                return;
            }

            await sendNotification(recipientToken, message.title, message.body);

        } catch (error) {
            console.error("Error sending notification:", error);
        }
    });

async function constructNotificationMessage(notification, senderName, senderGender, senderGrade) {
    switch (notification.type) {
        case 'friendRequest':
            return {
                title: "new friend request",
                body: `${senderName} wants to be friends`
            };
        case 'friendAccepted':
            return {
                title: "mo homies no problems",
                body: `${senderName} accepted your friend request`
            };

        case 'pollPick':
            return {
                title: `a ${senderGender} from ${senderGrade} picked you`,
                body: `wanna see what question it was?`
            };

        case 'auraDecay':
            return {
                title: "ur losing aura and it shows",
                body: "answer some polls to get it back"
            };

        case 'schoolUnlocked':
            const schoolName = notification.metadata?.schoolName || "A new school";
            return {
                title: "new school unlocked",
                body: `${schoolName} is now ready`
            };

        default:
            console.log("Unknown notification type:", notification.type);
            return null;
    }
}