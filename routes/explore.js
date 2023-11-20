/**
 * Routes for API exploration
 */

const express = require('express')
const router = express.Router()

const validateCallSequence = require('../utils/validators/callSequenceValidator')
const { buildApiCalls, buildApiCallsRandParams, sendApiCallToSut, sendApiCallOverSocket } = require('../controllers/exploreController')
// const { addApiCallSequence: dbAddSequence } = require('../firebase/data')

router.post('/', async function (req, res, next) {
  console.log('Exploration started...')

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

  // Add API call sequence to Firebase (async)
  // const collectionName = 'test_api_calls' // Temp name for testing
  // dbAddSequence(collectionName, responseObj.callSequence)

  return res.status(201).json(responseObj)
})

router.post('/random', async function (req, res, next) {
  console.log('Random exploration started...')

  // Ensure the request body contains necessary fields
  if (!validateCallSequence(req.body)) {
    return res.status(400).json({ error: 'Invalid API call sequence in request data' })
  }

  // Randomize the endpoint parameters and prepare necessary data to make calls
  const apiCalls = buildApiCallsRandParams(req.body.callSequence)

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

  // Add API call sequence to Firebase (async)
  // const collectionName = 'test_api_calls' // Temp name for testing
  // dbAddSequence(collectionName, responseObj.callSequence)

  return res.status(201).json(responseObj)
})

module.exports = router
