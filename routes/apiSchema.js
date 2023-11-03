/**
 * Routes for getting API schema
 */

const express = require('express')
const router = express.Router()

router.post('/get', function (req, res, next) {
  console.log('Getting API schema...')

  // TODO:
  //  - Extract URL of SUT from request (JSON)
  //  - Call control function for getting API schema (/swagger.json)
  //  - Send API schema in response if successful

  res.send('API schema sent') // Placeholder
})

module.exports = router
