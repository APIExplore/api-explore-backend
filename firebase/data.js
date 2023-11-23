const { db } = require('../firebase/config')

//Function to create a Firestore collection (in our case: api_calls, api_sequences or api_schemas collections)
async function createCollection(collectionName) {
  const collectionRef = db.collection(collectionName);
  try {
    await collectionRef.add({}); 
    console.log(`Collection '${collectionName}' created successfully.`);
  } catch (error) {
    console.error(`Error creating collection '${collectionName}':`, error);
  }
}

// Function for uploading a sequence of API calls to Firebase
async function uploadApiCallSequence (collectionName, apiCalls) {
  console.log(' - Uploading call sequence to firebase...')
  const total = apiCalls.length
  let count = 0

  for (const apiCall of apiCalls) {
    const documentName = generateId()
    const data = {
      operationId: apiCall.operationId,
      method: apiCall.method,
      endpoint: apiCall.endpoint,
      parameters: apiCall.parameters,
      requestBody: apiCall.requestBody,
      date: apiCall.date,
      duration: apiCall.duration,
      response: apiCall.response,
      id: documentName
    }
    await addApiCall(collectionName, documentName, data)
    printProgressBar(total, ++count)
  }
  console.log('\n - Call sequence has been uploaded')
}

// Function to create or update a sequence for a specific API schema
async function addApiCallSequence(apiSchemaId, sequenceId, sequenceName) {
  const apiCallSequencesCollectionRef = db.collection('api_call_sequences');

  try {
    const docRef = apiCallSequencesCollectionRef.doc(sequenceId);
    await docRef.set({
      apiSchemaId: apiSchemaId,
      sequenceName: sequenceName,
    });

    console.log('API Call Sequence added or updated to Firestore with ID:', sequenceId);
  } catch (error) {
    console.error('Error adding or updating API Call Sequence to Firestore:', error);
  }
}


// Function to create or update an API schema
async function addApiSchema(apiSchemaId, apiSchema, name) {
  const apiSchemasCollectionRef = db.collection('api_schemas');

  try {
    const docRef = apiSchemasCollectionRef.doc(apiSchemaId);
    await docRef.set({
      apiSchema: apiSchema, 
      name: name 
    });

    console.log('API Schema added or updated in Firestore with ID:', apiSchemaId);
  } catch (error) {
    console.error('Error adding or updating API Schema in Firestore:', error);
  }
}


// Function to add an API call to the Firestore database
async function addApiCall (collectionName, documentName, data) {
  const collectionRef = db.collection(collectionName)
  try {
    const docRef = collectionRef.doc(documentName)
    await docRef.set(data)
    // console.log(' - API call added to Firestore with ID: ', docRef.id)
  } catch (error) {
    console.error(`Error adding API call '${data.method} ${data.operationId}' to Firestore: `, error.message)
  }
}

// Function to get all the apiScehmas
async function getAllApiSchemas(schemaCollectionName) {
  const apiSchemasCollectionRef = db.collection(schemaCollectionName);

  try {
    const querySnapshot = await apiSchemasCollectionRef.get();
    const apiSchemas = [];

    querySnapshot.forEach((doc) => {
      const apiSchemaData = doc.data();
      apiSchemas.push(apiSchemaData);
    });

    return apiSchemas;
  } catch (error) {
    console.error(`Error getting API schemas from ${collectionName} in Firestore:`, error);
    return [];
  }
}

// Function to get a specific API schema by name
async function getApiSchemaByName(schemaCollectionName, schemaDocumentName) {
  const collectionRef = db.collection(schemaCollectionName);

  try {
    const docSnapshot = await collectionRef.doc(schemaDocumentName).get();

    if (docSnapshot.exists) {
      const apiSchema = docSnapshot.data();
      return apiSchema;
    } else {
      console.log('No matching schema found.');
      return null;
    }
  } catch (error) {
    console.error('Error getting API schema from Firestore:', error);
    return null;
  }
}

// Function to get all the apiCalls
async function getApiCalls(collectionName) {
  const collectionRef = db.collection(collectionName);

  try {
    const querySnapshot = await collectionRef.get();

    const apiCalls = [];
    querySnapshot.forEach((doc) => {
      const apiCallData = doc.data();
      apiCalls.push(apiCallData);
    });

    return apiCalls;
  } catch (error) {
    console.error(`Error getting API calls from Firestore:`, error.message);
    return [];
  }
}

function printProgressBar (total, count) {
  const percentage = Math.round((count / total) * 100)
  process.stdout.clearLine()
  process.stdout.cursorTo(0)
  process.stdout.write(` - Progress: [${'#'.repeat(percentage / 10)}${'.'.repeat(10 - percentage / 10)}] ${percentage}%`)
}

module.exports = { getAllApiSchemas, getApiSchemaByName, createCollection, uploadApiCallSequence, addApiCallSequence, addApiSchema, getApiCalls }
