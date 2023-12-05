const { v4: generateId } = require('uuid')

const { db } = require('../firebase/config')

const collections = { apiSchemas: 'test_api_schemas', apiCallSequences: 'test_api_call_sequences', apiCalls: 'test_api_calls' }

// Function to create a Firestore collection (in our case: api_calls, api_sequences or api_schemas collections)
async function createCollection (collectionName) {
  const collectionRef = db.collection(collectionName)
  try {
    await collectionRef.add({})
    console.log(`Collection '${collectionName}' created successfully.`)
  } catch (error) {
    console.error(`Error creating collection '${collectionName}':`, error)
  }
}

// Function for uploading a sequence of API calls to Firebase
async function uploadApiCallSequence (collectionName, sequenceId, apiCalls) {
  console.log('Uploading call sequence to firebase...')
  const total = apiCalls.length
  let count = 0

  for (const apiCall of apiCalls) {
    const documentName = generateId()
    const data = {
      operationId: apiCall.operationId,
      method: apiCall.method,
      url: apiCall.url,
      endpoint: apiCall.endpoint,
      parameters: apiCall.parameters,
      requestBody: apiCall.requestBody,
      date: apiCall.date,
      duration: apiCall.duration,
      response: apiCall.response,
      sequenceId
    }
    await addApiCall(collectionName, documentName, data)
    printProgressBar(total, ++count)
  }
  console.log('\n - Call sequence has been uploaded')
}

// Function to create or update a sequence for a specific API schema
async function addApiCallSequence (apiSchemaId, sequenceId, sequenceName) {
  const apiCallSequencesCollectionRef = db.collection(collections.apiCallSequences)

  try {
    const docRef = apiCallSequencesCollectionRef.doc(sequenceId)
    await docRef.set({
      apiSchemaId,
      name: sequenceName
    })

    console.log('API Call Sequence added or updated to Firestore with ID:', sequenceId)
  } catch (error) {
    console.error('Error adding or updating API Call Sequence to Firestore:', error)
  }
}

// Function to create or update an API schema
async function addApiSchema (apiSchemaId, apiSchema, name) {
  const apiSchemasCollectionRef = db.collection(collections.apiSchemas)

  try {
    const docRef = apiSchemasCollectionRef.doc(apiSchemaId)
    await docRef.set({
      apiSchema,
      name
    })

    console.log('API Schema added or updated in Firestore with ID:', apiSchemaId)
  } catch (error) {
    console.error('Error adding or updating API Schema in Firestore:', error)
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

// Function to get all the sequences, apiScehmas, or apiCalls
async function getAllApiInfo (collectionName) {
  const collectionRef = db.collection(collectionName)

  try {
    const querySnapshot = await collectionRef.get()
    const apiInfo = []

    querySnapshot.forEach((doc) => {
      const apiData = doc.data()
      apiInfo.push(apiData)
    })

    return apiInfo
  } catch (error) {
    console.error(`Error getting from ${collectionName} in Firestore:`, error)
    return []
  }
}

// Function to get a specific sequence, apiCall, or schema
async function getApiInfoByName (collectionName, documentName) {
  const collectionRef = db.collection(collectionName)

  try {
    const docSnapshot = await collectionRef.where('name', '==', documentName).get()

    if (!docSnapshot.empty) {
      const apiData = docSnapshot.docs[0].data()
      return apiData
    } else {
      console.log('No matching information found.')
      return null
    }
  } catch (error) {
    console.error('Error getting API information from Firestore:', error)
    return null
  }
}

// Check if document with property name exists in collection
async function docWithNameExists (collectionName, name) {
  const collectionRef = db.collection(collectionName)

  try {
    const querySnapshot = await collectionRef.where('name', '==', name).get()

    // Check if any documents match the query
    return !querySnapshot.empty
  } catch (error) {
    switch (collectionName) {
      case collections.apiSchemas:
        console.error('Error checking if API Schema exists in Firestore:', error)
        break
      case collections.apiCallSequences:
        console.error('Error checking if API call sequence exists in Firestore:', error)
        break
      case collections.apiCalls:
        console.error('Error checking if API call exists in Firestore:', error)
        break
      default:
        console.error(`Error checking if name exists in DB collection '${collectionName}'`, error)
        break
    }

    return false
  }
}

// Check if document with property name exists in collection for a specific API schema ID
async function docWithNameAndSchemaIdExists (collectionName, schemaId, name) {
  const collectionRef = db.collection(collectionName)

  try {
    const querySnapshot = await collectionRef
      .where('apiSchemaId', '==', schemaId)
      .where('name', '==', name)
      .get()

    // Check if any documents match the query
    return !querySnapshot.empty
  } catch (error) {
    switch (collectionName) {
      case collections.apiSchemas:
        console.error('Error checking if API Schema exists in Firestore:', error)
        break
      case collections.apiCallSequences:
        console.error('Error checking if API call sequence exists in Firestore:', error)
        break
      case collections.apiCalls:
        console.error('Error checking if API call exists in Firestore:', error)
        break
      default:
        console.error(`Error checking if name exists in DB collection '${collectionName}'`, error)
        break
    }

    return false
  }
}

// Get the ID of a sequence by schema ID and sequence name
async function getSequenceId (schemaId, sequenceName) {
  const collectionRef = db.collection(collections.apiCallSequences)

  try {
    const querySnapshot = await collectionRef
      .where('apiSchemaId', '==', schemaId)
      .where('name', '==', sequenceName)
      .get()

    // Check if any documents match the query
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id
    } else {
      return null
    }
  } catch (error) {
    console.error('Error fetching sequence ID from DB:', error)
    return null
  }
}

// Get the name property of a collection document by the document ID (doc name)
async function getNameById (collectionName, id) {
  const apiSchemasCollectionRef = db.collection(collectionName)

  try {
    const querySnapshot = await apiSchemasCollectionRef(id).get()

    // Check if any documents match the query
    const doc = querySnapshot.docs[0]

    if (doc) {
      return doc.name
    } else {
      console.log('No matching documents found in the query')
      return null
    }
  } catch (error) {
    switch (collectionName) {
      case 'api_schemas':
        console.error('Error fetching API schema ID by name from DB:', error)
        break
      case 'api_call_sequences':
        console.error('Error fetching API call sequence ID by name from DB:', error)
        break
      default:
        console.error(`Error getting ID by name in DB collection '${collectionName}'`, error)
    }
    return null
  }
}

// Get the ID (doc name) of a collection document by its name property
async function getIdByName (collectionName, name) {
  const apiSchemasCollectionRef = db.collection(collectionName)

  try {
    const querySnapshot = await apiSchemasCollectionRef.where('name', '==', name).get()

    // Check if any documents match the query
    const doc = querySnapshot.docs[0]

    if (doc) {
      return doc.id
    } else {
      console.log('No matching documents found in the query')
      return null
    }
  } catch (error) {
    switch (collectionName) {
      case 'api_schemas':
        console.error('Error fetching API schema ID by name from DB:', error)
        break
      case 'api_call_sequences':
        console.error('Error fetching API call sequence ID by name from DB:', error)
        break
      default:
        console.error(`Error getting ID by name in DB collection '${collectionName}'`, error)
    }
    return null
  }
}

// Function to get all API call sequences by apiSchemaId
async function getApiSequencesBySchemaId (apiSchemaId) {
  const collectionName = collections.apiCallSequences
  const collectionRef = db.collection(collectionName)

  try {
    const querySnapshot = await collectionRef.where('apiSchemaId', '==', apiSchemaId).get()
    const apiSequences = []

    querySnapshot.forEach((doc) => {
      const apiSequence = doc.data()
      apiSequences.push(apiSequence)
    })

    return apiSequences
  } catch (error) {
    console.error('Error getting API call sequences by schemaId in Firestore:', error)
    return []
  }
}

// Function to get all API calls by sequenceId
async function getApiCallsBySequenceId (sequenceId) {
  const collectionName = collections.apiCalls
  const collectionRef = db.collection(collectionName)

  try {
    const querySnapshot = await collectionRef
      .where('sequenceId', '==', sequenceId)
      .get()
    const apiCalls = []

    querySnapshot.forEach((doc) => {
      const apiCall = doc.data()
      apiCalls.push(apiCall)
    })

    return apiCalls.sort((a, b) => new Date(a.date) - new Date(b.date))
  } catch (error) {
    console.error('Error getting API calls by sequenceId in Firestore:', error)
    return []
  }
}

async function deleteApiCallsBySequenceId (sequenceId) {
  console.log('Deleting previous call sequence...')

  const collectionName = collections.apiCalls
  const collectionRef = db.collection(collectionName)

  try {
    const querySnapshot = await collectionRef
      .where('sequenceId', '==', sequenceId)
      .get()

    const batch = db.batch()
    querySnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })

    await batch.commit()

    return true
  } catch (error) {
    console.error(` - Failed to delete API calls of sequence ID '${sequenceId}'`)
    return false
  }
}

// Print progress bar when uploading API calls to DB
function printProgressBar (total, count) {
  const percentage = Math.round((count / total) * 100)
  process.stdout.clearLine()
  process.stdout.cursorTo(0)
  process.stdout.write(` - Progress: [${'#'.repeat(percentage / 10)}${'.'.repeat(10 - percentage / 10)}] ${percentage}%`)
}

// Get a specific API sequence from the schema by its name
async function getApiSequenceByName(sequenceName, schemaId) {
  const collectionRef = db.collection(collections.apiCallSequences);

  try {
    const docSnapshot = await collectionRef
        .where('apiSchemaId', '==', schemaId)
        .where('name', '==', sequenceName)
        .get();

    if (!docSnapshot.empty) {
      const sequenceData = docSnapshot.docs[0].data();
      return { id: docSnapshot.docs[0].id, ...sequenceData };
    } else {
      console.log(`Sequence '${sequenceName}' not found`);
      return null;
    }
  } catch (error) {
    console.error(`Error getting API sequence with name '${sequenceName}' from Firestore:`, error);
    return null;
  }
}

// Update an API sequence's favorite flag by its name
async function updateApiSequenceFavorite(sequenceName, newFavoriteFlag) {
  const collectionRef = db.collection(collections.apiCallSequences);

  try {
    const sequenceSnapshot = await collectionRef.where('name', '==', sequenceName).get();

    if (!sequenceSnapshot.empty) {
      const sequenceId = sequenceSnapshot.docs[0].id;
      const sequenceRef = collectionRef.doc(sequenceId);

      await sequenceRef.update({ favorite: newFavoriteFlag });
      console.log(`Sequence '${sequenceName}' favorite flag updated successfully`);
      return { id: sequenceId, name: sequenceName, favorite: newFavoriteFlag };
    } else {
      console.log(`Sequence '${sequenceName}' not found`);
      return null;
    }
  } catch (error) {
    console.error(`Error updating favorite flag for sequence '${sequenceName}' in Firestore:`, error);
    return null;
  }
}

module.exports = {
  collections,
  docWithNameExists,
  docWithNameAndSchemaIdExists,
  addApiSchema,
  addApiCallSequence,
  getIdByName,
  uploadApiCallSequence,
  getAllApiInfo,
  getApiInfoByName,
  getApiSequencesBySchemaId,
  getApiCallsBySequenceId,
  getNameById,
  deleteApiCallsBySequenceId,
  getApiSequenceByName,
  updateApiSequenceFavorite,
  getSequenceId,
}
