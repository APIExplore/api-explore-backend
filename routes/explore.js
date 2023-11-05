/**
 * Routes for API exploration
 */

const express = require('express')
const router = express.Router()

const validateCallSequence = require('../utils/validators/callSequenceValidator')
const { buildApiCalls, sendApiCall } = require('../controllers/exploreController')

router.post('/random', async function (req, res, next) {
  console.log('Random exploration started...')

  // Ensure the request body contains necessary fields
  if (!validateCallSequence(req.body)) {
    console.error(' - Invalid request data')
    return res.status(400).json({ error: 'Invalid request data' })
  }

  // Randomize the endpoint parameters and prepare necessary data to make calls
  const apiCalls = buildApiCalls(req.body.callSequence)
  if (!apiCalls) {
    console.error(' - Error parsing API schema')
    return res.status(500).json({ error: 'Error parsing API schema' })
  }

  // Send calls to SUT
  const responseObj = { callSequence: [] }
  for (const apiCall of apiCalls) {
    responseObj.callSequence.push(await sendApiCall(apiCall))
  }

  // TODO:
  //  - Upload response data to Firebase through utility functions
  //  - Setup socket for communication with frontend?
  //  - Send final response indicating success/failure

  return res.status(200).json(responseObj) // Placeholder
})

module.exports = router
