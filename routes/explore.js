/**
 * Routes for API exploration
 */

const express = require('express')
const router = express.Router()

const validateCallSequence = require('../utils/validators/callSequenceValidator')
const { buildApiCalls, sendApiCallToSut, sendApiCallOverSocket } = require('../controllers/exploreController')

router.post('/random', async function (req, res, next) {
  console.log('Random exploration started...')

  // Ensure the request body contains necessary fields
  if (!validateCallSequence(req.body)) {
    return res.status(400).json({ error: 'Invalid API call sequence in request data' })
  }

  // Randomize the endpoint parameters and prepare necessary data to make calls
  const apiCalls = buildApiCalls(req.body.callSequence)
  if (!apiCalls) {
    return res.status(400).json({ error: 'Error building API calls' })
  }

  // Send calls to SUT
  const responseObj = { callSequence: [] }
  for (const apiCall of apiCalls) {
    const response = await sendApiCallToSut(apiCall)
    sendApiCallOverSocket(response)
    responseObj.callSequence.push(response)
  }

  // TODO:
  //  - Upload response data to Firebase through utility functions
  //  - Send final response indicating success/failure

  return res.status(200).json(responseObj) // Placeholder
})

module.exports = router
