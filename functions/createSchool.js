const functions = require('firebase-functions');
const admin = require('firebase-admin');
const crypto = require('crypto');

// Helper function to generate UUID
function generateUUID() {
    return crypto.randomUUID();
}
    
const girlFirstNames = [
    "Emma",
    "Olivia",
    "Ava",
    "Isabella",
    "Sophia",
    "Charlotte",
    "Mia",
    "Harper",
    "Amelia",
    "Evelyn",
    "Abigail",
    "Emily"
]

const boyFirstNames = [
    "Liam",
    "Noah",
    "William",
    "James",
    "Oliver",
    "Ben",
    "Elijah",
    "Lucas",
    "Mason",
    "Ethan",
    "Alexander",
    "Henry"
]

 const boyLastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Davis",
    "Miller",
    "Wilson",
    "Moore",
    "Taylor",
    "Anderson",
    "Thomas",
    "Jackson"
]

 const  girlLastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Davis",
    "Miller",
    "Wilson",
    "Moore",
    "Taylor",
    "Anderson",
    "Thomas",
    "Jackson"
]

exports.createSchool = functions.firestore
  .document('_schools/{documentId}')
  .onCreate(async (snap, context) => {
    const newDocument = snap.data();
    
    try {
      // Update the document with additional required fields
      await snap.ref.set({
        auraThisWeek: 0,
        county: "",
        enabled: true,
        id: context.params.documentId,
        isLocked: false,
        lat: newDocument.lat || "",
        location: "",
        long: newDocument.long || "",
        maxStudents: 400,
        name: newDocument.name || "",
        pollIds: [],
        studentCount: 0,
        students: [],
        totalAura: 0
      }, { merge: true });

      console.log(`School ${context.params.documentId} initialized with default values`);
      
    } catch (error) {
      console.error('Error initializing school:', error);
    }

    // create 4 new documents in the _users collection
    for (let i = 0; i < 4; i++) {
        let firstName, lastName;  // Declare variables before use
        
        // if number is even, pick a girl first name, if odd, pick a boy first name
        if (i % 2 === 0) {
            firstName = girlFirstNames[Math.floor(Math.random() * girlFirstNames.length)];
        } else {
            firstName = boyFirstNames[Math.floor(Math.random() * boyFirstNames.length)];
        }

        // if number is even, pick a girl last name, if odd, pick a boy last name
        if (i % 2 === 0) {
            lastName = girlLastNames[Math.floor(Math.random() * girlLastNames.length)];
        } else {
            lastName = boyLastNames[Math.floor(Math.random() * boyLastNames.length)];
        }

        const userId = generateUUID();
        const username = context.params.documentId + i + "us";
        
        try {
            await admin.firestore().collection('_users').add({
                aura: 3,
                bio: "A school to work on your ideas",
                birthday: "2009-12-18",
                bread: 40,
                color: "",
                crushId: "",
                dailyAura: 0,
                dateJoined: admin.firestore.FieldValue.serverTimestamp(),
                fcmToken: "",
                firstName: firstName,
                friends: [],
                friendsStatus: "Add +",
                fullNameReveals: 0,
                gender: i % 2 === 0 ? "girl" : "boy",
                grade: "junior",
                id: userId,
                incomingFriendRequests: [],
                incomingMarkedAsCrush: [],
                invitedFriends: [],
                lastActive: admin.firestore.FieldValue.serverTimestamp(),
                lastName: lastName,
                lastPollFinished: null,
                lastVotedOn: null,
                letterReveals: 0,
                mbti: "INTJ",
                movie: "Whiplash",
                music: "The End",
                number: "",
                ogBadge: true,
                outgoingFriendRequests: [],
                outgoingMarkedAsCrush: [],
                phoneContacts: [],
                proPic: "",
                referral: 0,
                referralCode: "",
                relationshipStatus: "single af",
                schoolId: context.params.documentId,
                shields: 0,
                username: username
            });
            console.log(`Created user ${username} with ID ${userId}`);
        } catch (error) {
            console.error(`Error creating user ${i}:`, error);
        }
    }
  });