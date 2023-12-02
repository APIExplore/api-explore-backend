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

const sequenceInfo = { name: null, id: null }

// Common function for API call sequence exploration
async function exploreApiCallSequence (req, res, buildApiCallsFn) {
  // Ensure the request body has a name property (for the schema)
  if (!(Object.prototype.hasOwnProperty.call(req.body, 'name')) || req.body.name.trim() === '') {
    console.error(' - Error: no name specified for the call sequence')
    return res.status(400).json({ error: 'No API call sequence name specified' })
  }

  const sequenceName = req.body.name

  if (!schemaInfo.id || !schemaInfo.name) {
    console.error(' - Error: API schema has not been fetched and set')
    return res.status(400).json({ error: 'API schema has not been fetched and set' })
  }

  // Ensure the request body contains necessary fields
  if (!validateCallSequence(req.body)) {
    return res.status(400).json({ error: 'Invalid API call sequence in request data' })
  }

  // Check if sequence name exists in DB for current schema
  let sequenceId = null
  const warnings = []
  const match = await db.docWithNameAndSchemaIdExists(db.collections.apiCallSequences, schemaInfo.id, sequenceName)
  if (!match) {
    // New sequence, add to the database
    console.log(' - New sequence, adding to DB')
    sequenceId = generateId()
    sequenceInfo.name = sequenceName
    sequenceInfo.id = sequenceId
    db.addApiCallSequence(schemaInfo.id, sequenceId, sequenceName)
  } else {
    // Sequence already exists
    sequenceId = await db.getSequenceId(schemaInfo.id, sequenceName)
    if (!sequenceId) {
      return res.status(500).json({ error: 'Failed to get API call sequence ID from DB' })
    }
    console.log(` - Sequence name '${sequenceName}' already exists in DB for schema '${schemaInfo.name}'`)

    // Check if another sequence was run prior to this one, if not, no need to restore the state.
    if (!(sequenceName === sequenceInfo.name) && !(sequenceId === sequenceInfo.id)) {
      sequenceInfo.name = sequenceName
      sequenceInfo.id = sequenceId
      console.log('Restoring SUT state...')

      // Run previous calls saved in the sequence to restore SUT state (assumes SUT has been reset).
      const previousApiCalls = await db.getApiCallsBySequenceId(sequenceId)
      if (previousApiCalls === null) {
        return res.status(500).json({ error: `Failed to fetch previous API calls of sequence '${sequenceName}':${schemaInfo.id}` })
      }

      for (const apiCall of previousApiCalls) {
        const response = await sendApiCallToSut(apiCall)
        if (!response) {
          // Check for warnings (i.e., response status and/or data has changed)
          return res.status(500).json({ error: 'Cannot connect to the SUT, ensure the correct SUT is running and that the correct schema is used' })
        }

        if (response.warnings) {
          for (const warning of response.warnings) {
            warnings.push(warning)
          }
        }
      }

      console.log('SUT state restored, resuming exploration...')
    }
  }

  // Set the endpoint parameters and prepare necessary data to make calls (will return null on error, e.g, if active schema do not match)
  const apiCalls = buildApiCallsFn(req.body.callSequence)
  if (!apiCalls) {
    return res.status(400).json({ error: 'Error building API calls (make sure that the correct schema is set)' })
  }

  // Send calls to SUT
  const responseObj = { callSequence: [] }
  for (const apiCall of apiCalls) {
    const response = await sendApiCallToSut(apiCall)
    if (!response) {
      return res.status(500).json({ error: 'Cannot connect to the SUT, ensure the correct SUT is running and that the correct schema is used' })
    }
    sendApiCallOverSocket(response)
    responseObj.callSequence.push(response)
  }

  db.uploadApiCallSequence(db.collections.apiCalls, sequenceId, responseObj.callSequence)

  responseObj.warnings = warnings
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
