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
      name: sequenceName,
      favorite: false
    })

    console.log('API Call Sequence added or updated to Firestore with ID:', sequenceId)
  } catch (error) {
    console.error('Error adding or updating API Call Sequence to Firestore:', error)
  }
}

// Function to create or update an API schema
async function addApiSchema (schema, schemaName) {
  const apiSchemasCollectionRef = db.collection(collections.apiSchemas)

  try {
    await db.runTransaction(async (transaction) => {
      const schemaId = generateId()

      // Check if a schema with the provided name already exists within the transaction
      const existingSchema = await transaction.get(apiSchemasCollectionRef.where('name', '==', schemaName).limit(1))

      if (!existingSchema.empty) {
        console.log(` - A schema with the name '${schemaName}' already exists. Cannot add a duplicate.`)
        return false
      }

      // If no duplicate is found, proceed to add or update the schema
      const docRef = apiSchemasCollectionRef.doc(schemaId)
      transaction.set(docRef, {
        apiSchema: schema,
        name: schemaName
      })

      console.log(' - API Schema added to Firestore with ID:', schemaId)
      return false
    })
  } catch (error) {
    console.error(' - Error adding or updating API Schema in Firestore:', error)
    return true
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

// Check if schema with property name exists in collection
async function apiSchemaExists (schemaName) {
  const collectionRef = db.collection(collections.apiSchemas)

  try {
    const querySnapshot = await collectionRef
      .where('name', '==', schemaName)
      .get()

    return !querySnapshot.empty
  } catch (error) {
    console.error('Error checking if API Schema exists in Firestore:', error)
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
    const callsSnapshot = await collectionRef
      .where('sequenceId', '==', sequenceId)
      .get()
    const apiCalls = []

    callsSnapshot.forEach((doc) => {
      const apiCall = doc.data()
      apiCalls.push(apiCall)
    })

    return apiCalls.sort((a, b) => new Date(a.date) - new Date(b.date))
  } catch (error) {
    console.error('Error getting API calls by sequenceId in Firestore:', error)
    return []
  }
}

// Function for deleting all API calls of a squence
async function deleteApiCalls (sequenceId) {
  console.log(`Deleting calls of sequence '${sequenceId}'...`)
  const callsRef = db.collection(collections.apiCalls)

  try {
    const callsSnapshot = await callsRef
      .where('sequenceId', '==', sequenceId)
      .get()

    const batch = db.batch()

    callsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })

    await batch.commit()

    return true
  } catch (error) {
    console.error(` - Error deleting API calls of sequence '${sequenceId}':`, error.message)
    return false
  }
}

// Function for deleting a call sequence and its associated calls
async function deleteCallSequence (sequenceId) {
  console.log(`Deleting call sequence '${sequenceId}'...`)
  const sequenceRef = db.collection(collections.apiCallSequences).doc(sequenceId)
  const callsRef = db.collection(collections.apiCalls)

  try {
    const callsSnapshot = await callsRef
      .where('sequenceId', '==', sequenceId)
      .get()

    const batch = db.batch()

    // Delete all calls of the sequence
    callsSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })

    // Delete the sequence
    await sequenceRef.delete()

    await batch.commit()
    console.log(` - Successfully deleted sequence '${sequenceId}', and associated calls`)

    return true
  } catch (error) {
    console.error(` - Error deleting sequence '${sequenceId}' and associated calls:`, error.message)
    return false
  }
}

// Function for deleting an API schema and its associated sequences/calls
async function deleteApiSchema (apiSchemaId) {
  console.log(`Deleting API schema '${apiSchemaId}'...`)

  const schemaRef = db.collection(collections.apiSchemas).doc(apiSchemaId)
  const sequencesRef = db.collection(collections.apiCallSequences)
  const callsRef = db.collection(collections.apiCalls)

  try {
    const sequencesSnapshot = await sequencesRef
      .where('apiSchemaId', '==', apiSchemaId)
      .get()

    const batch = db.batch()

    for (const doc of sequencesSnapshot.docs) {
      const sequenceId = doc.id
      const callsSnapshot = await callsRef
        .where('sequenceId', '==', sequenceId)
        .get()

      callsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })

      batch.delete(doc.ref)
    }

    await schemaRef.delete()
    await batch.commit()
    console.log(` - Successfully deleted API schema ${apiSchemaId}, and associated sequences/calls`)

    return true
  } catch (error) {
    console.error(` - Error deleting API schema ${apiSchemaId}, and associated sequences/calls:`, error.message)
    return false
  }
}

// Function for renaming a call sequence
async function renameCallSequence (sequenceId, newName) {
  console.log(`Renaming sequence '${sequenceId}'...`)

  const sequencesRef = db.collection(collections.apiCallSequences).doc(sequenceId)

  try {
    await sequencesRef.update({
      name: newName
    })

    console.log(`Sequence '${sequenceId}' successfully renamed to '${newName}'.`)
    return true
  } catch (error) {
    console.error(`- Error renaming sequence '${sequenceId}':`, error)
    return false
  }
}

// Function for renaming an API schema
async function renameApiSchema (schemaId, newName) {
  console.log(`Renaming sequence '${schemaId}'...`)

  const schemaRef = db.collection(collections.apiSchemas).doc(schemaId)

  try {
    await schemaRef.update({
      name: newName
    })

    console.log(`Sequence '${schemaId}' successfully renamed to '${newName}'.`)
    return true
  } catch (error) {
    console.error(`- Error renaming sequence '${schemaId}':`, error)
    return false
  }
}

// Function to delete a specific API call/schema/sequence, the inputs are the API call/schema/sequence name and the record ID
async function deleteBySequenceId (collectionName, documentId) {
  const collectionRef = db.collection(collectionName)

  try {
    const docRef = collectionRef.doc(documentId)
    const docSnapshot = await docRef.get()

    if (docSnapshot.exists) {
      await docRef.delete()
      console.log(`Document deleted from Firestore. Collection: ${collectionName}, Document ID: ${documentId}`)
    } else {
      console.log(`Document does not exist or not found. Collection: ${collectionName}, Document ID: ${documentId}`)
    }
  } catch (error) {
    console.error(`Error deleting document from Firestore. Collection: ${collectionName}, Document ID: ${documentId}`, error)
  }
}

// Function to delete API call/schema/sequence and all the related records
async function deleteBySchema (collectionName) {
  const collectionRef = db.collection(collectionName)
  try {
    const querySnapshot = await collectionRef.get()

    const batch = db.batch()
    querySnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref)
    })
    await batch.commit()
    console.log(`Documents deleted from Firestore collection: ${collectionName}`)
    await collectionRef.get().then(snapshot => {
      if (snapshot.size > 0) {
        console.log(`Error: Documents still exist in collection: ${collectionName}`)
      } else {
        console.log(`Collection does not contain any documents. Deleting collection: ${collectionName}`)
        collectionRef.delete()
        console.log(`Collection deleted from Firestore: ${collectionName}`)
      }
    })
  } catch (error) {
    console.error(`Error deleting collection from Firestore: ${collectionName}`, error)
  }
}

// Function to delete a sequence and its associated calls
async function deleteSequenceAndCalls (sequenceId, apiSequence, apiCall) {
  const sequenceRef = db.collection(apiSequence).doc(sequenceId)
  const callsRef = db.collection(apiCall)

  try {
    // Delete the sequence
    await sequenceRef.delete()
    console.log(`Sequence deleted: ${sequenceId}`)
    // Delete associated calls
    const callsQuerySnapshot = await callsRef.where('sequenceId', '==', sequenceId).get()
    const batch = db.batch()
    callsQuerySnapshot.forEach((callDoc) => {
      batch.delete(callDoc.ref)
    })
    await batch.commit()
    console.log(`Associated calls deleted for sequence: ${sequenceId}`)
  } catch (error) {
    console.error(`Error deleting sequence and associated calls: ${sequenceId}`, error)
  }
}

// Function to edit the name of a Firestore collection
async function editCollectionName (oldCollectionName, newCollectionName) {
  const oldCollectionRef = db.collection(oldCollectionName)

  try {
    const snapshot = await oldCollectionRef.get()
    const newCollectionRef = db.collection(newCollectionName)

    snapshot.forEach(async (doc) => {
      await newCollectionRef.doc(doc.id).set(doc.data())
      await doc.ref.delete()
    })

    console.log(`Collection name updated: ${oldCollectionName} -> ${newCollectionName}`)
  } catch (error) {
    console.error(`Error updating collection name: ${error}`)
  }
}

/* // Function to edit the name of a Firestore document within a collection
async function editDocumentName(collectionName, oldDocumentName, newDocumentName) {
  const collectionRef = db.collection(collectionName);

  try {
    const docSnapshot = await collectionRef.doc(oldDocumentName).get();
    if (docSnapshot.exists) {
      await collectionRef.doc(newDocumentName).set(docSnapshot.data());
      await collectionRef.doc(oldDocumentName).delete();
      console.log(`Document name updated in collection ${collectionName}: ${oldDocumentName} -> ${newDocumentName}`);
    } else {
      console.log(`Document not found in collection ${collectionName}: ${oldDocumentName}`);
    }
  } catch (error) {
    console.error(`Error updating document name: ${error}`);
  }
} */

// Print progress bar when uploading API calls to DB
function printProgressBar (total, count) {
  const percentage = Math.round((count / total) * 100)
  process.stdout.clearLine()
  process.stdout.cursorTo(0)
  process.stdout.write(` - Progress: [${'#'.repeat(percentage / 10)}${'.'.repeat(10 - percentage / 10)}] ${percentage}%`)
}

// Get a specific API sequence from the schema by its name
async function getApiSequenceByName (sequenceName, schemaId) {
  const collectionRef = db.collection(collections.apiCallSequences)

  try {
    const docSnapshot = await collectionRef
      .where('apiSchemaId', '==', schemaId)
      .where('name', '==', sequenceName)
      .get()

    if (!docSnapshot.empty) {
      const sequenceData = docSnapshot.docs[0].data()
      return { id: docSnapshot.docs[0].id, ...sequenceData }
    } else {
      console.log(`Sequence '${sequenceName}' not found`)
      return null
    }
  } catch (error) {
    console.error(`Error getting API sequence with name '${sequenceName}' from Firestore:`, error)
    return null
  }
}

// Update an API sequence's favorite flag by its name
async function updateApiSequenceFavorite (sequenceName, newFavoriteFlag) {
  const collectionRef = db.collection(collections.apiCallSequences)

  try {
    const sequenceSnapshot = await collectionRef.where('name', '==', sequenceName).get()

    if (!sequenceSnapshot.empty) {
      const sequenceId = sequenceSnapshot.docs[0].id
      const sequenceRef = collectionRef.doc(sequenceId)

      await sequenceRef.update({ favorite: newFavoriteFlag })
      console.log(`Sequence '${sequenceName}' favorite flag updated successfully`)
      return { id: sequenceId, name: sequenceName, favorite: newFavoriteFlag }
    } else {
      console.log(`Sequence '${sequenceName}' not found`)
      return null
    }
  } catch (error) {
    console.error(`Error updating favorite flag for sequence '${sequenceName}' in Firestore:`, error)
    return null
  }
}

module.exports = {
  collections,
  apiSchemaExists,
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
  deleteBySchema,
  deleteSequenceAndCalls,
  editCollectionName,
  deleteBySequenceId,
  getApiSequenceByName,
  updateApiSequenceFavorite,
  getSequenceId,
  deleteApiCalls,
  deleteCallSequence,
  deleteApiSchema,
  renameCallSequence,
  renameApiSchema
}
