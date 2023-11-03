/**
 * Routes for getting API schema
 */

const express = require('express')
const router = express.Router()
const axios = require('axios')
const fs = require('fs')

router.post('/fetch', async function (req, res, next) {
  console.log('Getting API schema...')

  // Check that valid request data is included
  const reqData = req.body
  if (!reqData || !reqData.address) {
    return res.status(400).json({ error: 'Invalid request data', data: req.body })
  }

  const url = reqData.address
  try {
    const response = await axios.get(url)

    if (response.status === 200) {
      const data = response.data

      // Write API schema to a file (currently root directory)
      const filePath = 'apiSchema.json'
      fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
        if (err) {
          console.error(' - Error writing to file:', err)
          return res.status(500).json({ error: 'Failed to save API schema' })
        }
        console.log(' - API schema saved')
        res.json(data) // Send API schema in response
        console.log(' - API schema sent in response')
      })
    } else {
      return res.status(response.status).json({ error: `Failed to fetch API schema from ${url}` })
    }
  } catch (error) {
    console.error(` - Error fetching API schema from ${url}:`, error.message)
    return res.status(500).json({ error: `Failed to fetch API schema from ${url}` })
  }
})

router.post('/set', async function (req, res, next) {

})

module.exports = router
