const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");

const app = express();

// Automatically allow cross-origin requests
app.use(cors({origin: true}));


const admin = require("firebase-admin");
admin.initializeApp();

async function sendNotification(token, title, body, deepLink) {
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
                },
                deepLink: deepLink
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

            await sendNotification(recipientToken, message.title, message.body, message.deepLink);

        } catch (error) {
            console.error("Error sending notification:", error);
        }
    });

async function constructNotificationMessage(notification, senderName, senderGender, senderGrade) {
    switch (notification.type) {
        case 'friendRequest':
            return {
                title: "new friend request",
                body: `${senderName} wants to be friends`,
                deepLink: `ong://friends/requests/${notification.senderId}`
            };
        case 'friendAccepted':
            return {
                title: "yo you got more homies now",
                body: `${senderName} accepted your friend request`,
                deepLink: `ong://friends/profile/${notification.senderId}`
            };

        case 'pollPick':
            return {
                title: `a ${senderGender} from ${senderGrade} picked you`,
                body: `wanna see what question it was?`,
                deepLink: `ong://polls/picked/${notification.pollId}`
            };
        
        case 'letterRevealed':
            return {
                title: `a ${senderGender} from ${senderGrade} revealed the first letter of ur name`,
                body: `next time use a shield`,
                deepLink: `ong://reveals/letter/${notification.revealId}`
            };

        case 'shieldRevealed':
            return {
                title: `ur shield just blocked a reveal`,
                body: `cop more shields to stay anonymous`,
                deepLink: `ong://reveals/shield/${notification.revealId}`
            };

        case 'auraDecay':
            return {
                title: "ur losing aura and it shows",
                body: "answer some polls to get it back",
                deepLink: "ong://profile/aura"
            };

        case 'schoolUnlocked':
            const schoolName = notification.metadata?.schoolName || "A new school";
            return {
                title: "new school unlocked",
                body: `${schoolName} is now ready`,
                deepLink: `ong://schools/${notification.metadata?.schoolId || ''}`
            };

        default:
            console.log("Unknown notification type:", notification.type);
            return null;
    }
}