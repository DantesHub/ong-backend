const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.createSchool = functions.firestore
  .document('schools/{documentId}')
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
  });