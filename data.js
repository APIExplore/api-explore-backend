const { db } = require('./config');

//Function to create a Firestore collection
async function createCollection(collectionName) {
    const collectionRef = db.collection(collectionName);
    try {
      await collectionRef.add({}); 
      console.log(`Collection '${collectionName}' created successfully.`);
    } catch (error) {
      console.error(`Error creating collection '${collectionName}':`, error);
    }
}
//createCollection('api_calls');

// Function to add an API call to the Firestore database
async function addApiCall(collectionName, documentName) {
    const apiCallsCollectionRef = db.collection(collectionName);
    try {
      const docRef = apiCallsCollectionRef.doc(documentName);
      docRef.set({
        timestamp: new Date(),
        method: 'GET',
        endpoint: '/api/endpoint',
        parameters: { param1: 'Testvalue1', param2: 'Testvalue2' },
        requestBody: 'Request data',
        statusCode: 200,
        response: 'Response random data',
      });
      console.log('API Call added to Firestore with ID:', docRef.id);
    } catch (error) {
      console.error('Error adding API Call to Firestore:', error);
    }
}  
addApiCall('api_calls', 'ApiCallF');

module.exports = {createCollection, addApiCall};