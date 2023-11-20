const { v4: generateId } = require('uuid')

const { db } = require('../firebase/config')

// Check if API schema of name exists
async function apiSchemaExists (name) {
  const apiSchemasCollectionRef = db.collection('api_schemas')

  try {
    const query = await apiSchemasCollectionRef.where('name', '==', name).get()

    // Check if any documents match the query
    return !query.empty
  } catch (error) {
    console.error('Error checking if API Schema exists in Firestore:', error)
    return false
  }
}

// Function to create or update an API schema
async function addApiSchema (apiSchemaId, apiSchema, name) {
  const apiSchemasCollectionRef = db.collection('api_schemas')

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

// Function for uploading a sequence of API calls to Firebase
async function addApiCallSequence (collectionName, apiCalls) {
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
      response: apiCall.response
    }
    await addApiCall(collectionName, documentName, data)
    printProgressBar(total, ++count)
  }
  console.log('\n - Call sequence has been uploaded')
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

function printProgressBar (total, count) {
  const percentage = Math.round((count / total) * 100)
  process.stdout.clearLine()
  process.stdout.cursorTo(0)
  process.stdout.write(` - Progress: [${'#'.repeat(percentage / 10)}${'.'.repeat(10 - percentage / 10)}] ${percentage}%`)
}

module.exports = { apiSchemaExists, addApiSchema, addApiCallSequence }
