/**
 * Routes for API exploration
 */

const express = require('express')
const router = express.Router()
const { v4: generateId } = require('uuid')

const validateCallSequence = require('../utils/validators/callSequenceValidator')
const { buildApiCalls, buildApiCallsRandParams, sendApiCallToSut, sendApiCallOverSocket } = require('../controllers/exploreController')
const db = require('../firebase/data')
const { schemaInfo } = require('../routes/apiSchema')

// Common function for API call sequence exploration
async function exploreApiCallSequence (req, res, buildApiCallsFn) {
  // Ensure the request body has a name property (for the schema)
  if (!(Object.prototype.hasOwnProperty.call(req.body, 'name')) || req.body.name.trim() === '') {
    console.error(' - Error: no name specified for the call sequence')
    return res.status(400).json({ error: 'No API call sequence name specified' })
  }

  if (!schemaInfo.id || !schemaInfo.name) {
    console.error(' - Error: API schema has not been fetched and set')
    return res.status(400).json({ error: 'API schema has not been fetched and set' })
  }

  // Ensure the request body contains necessary fields
  if (!validateCallSequence(req.body)) {
    return res.status(400).json({ error: 'Invalid API call sequence in request data' })
  }

  // Set the endpoint parameters and prepare necessary data to make calls (will return null on error, e.g, if active schema do not match)
  const apiCalls = buildApiCallsFn(req.body.callSequence)
  if (!apiCalls) {
    return res.status(400).json({ error: 'Error building API calls (make sure that the correct schema is set)' })
  }

  // Check if schema name exists in DB
  let apiCallSequenceId = null
  const match = await db.docWithNameAndSchemaIdExists(db.collections.apiCallSequences, schemaInfo.id, req.body.name)
  if (!match) {
    console.log(' - New sequence, adding to DB')
    apiCallSequenceId = generateId()
    db.addApiCallSequence(schemaInfo.id, apiCallSequenceId, req.body.name)
  } else {
    apiCallSequenceId = await db.getSequenceId(schemaInfo.id, req.body.name)
    if (!apiCallSequenceId) {
      return res.status(500).json({ error: 'Failed to get API call sequence ID from DB' })
    }
    console.log(' - Sequence name already exists in DB')
  }

  // Send calls to SUT
  const responseObj = { callSequence: [] }
  for (const apiCall of apiCalls) {
    const response = await sendApiCallToSut(apiCall)
    if (!response) {
      return res.status(400).json({ error: 'Cannot connect to the SUT, ensure the correct SUT is running and that the correct schema is used' })
    }
    sendApiCallOverSocket(response)
    responseObj.callSequence.push(response)
  }

  db.uploadApiCallSequence(db.collections.apiCalls, apiCallSequenceId, responseObj.callSequence)

  return res.status(201).json(responseObj)
}

// Route handler for the standard exploration
router.post('/', async function (req, res, next) {
  console.log('Exploration started...')
  return await exploreApiCallSequence(req, res, buildApiCalls)
})

// Route handler for random exploration
router.post('/random', async function (req, res, next) {
  console.log('Random exploration started...')
  return await exploreApiCallSequence(req, res, buildApiCallsRandParams)
})

module.exports = router
