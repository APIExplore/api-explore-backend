/**
 * Routes for API exploration
 */

const express = require('express')
const router = express.Router()

router.post('/random', function (req, res, next) {
  console.log('Random exploration started...')

  // TODO:
  //  - Pass JSON request data (assume infromation about endpoint, parameters and port) to controller function for constructing API call sequences
  //  - Call controller function for making API calls to the SUT and record response data.
  //  - Upload response data to Firebase through utility functions
  //  - Send final response indicating success/failure

  res.send('Random exploration done') // Placeholder
})

module.exports = router
