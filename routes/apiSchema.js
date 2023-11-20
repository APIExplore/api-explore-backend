/**
 * Routes for getting API schema
 */

const express = require('express')
const router = express.Router()
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const { v4: generateId } = require('uuid')

// const validateApiSchema = require('../utils/validators/apiSchemaV2Validator')
const { readApiSchema, writeApiSchema } = require('../utils/apiSchemaUtils')
const getPathAndMethod = require('../controllers/apiSchemaController')
const uploadSchema = require('../middleware/apiSchemaMiddleware.js')
const { apiSchemaExists, addApiSchema } = require('../firebase/data')

// Fetch all schemas from DB (currently mocked)
router.get('/fetch', async function (req, res, next) {
  // Mock json data
  const apiSchemas = [
    {
      name: 'feature-service'
    },
    {
      name: 'disease'
    },
    {
      name: 'languagetool'
    }
  ]
  return res.json(apiSchemas)
})

// Fetch schema with name from DB (currently mocked)
router.get('/fetch/:schemaName', async function (req, res, next) {
  const schemaName = req.params.schemaName

  const filePath = path.join(__dirname, '../apiSchemas', `${schemaName}.json`)

  try {
    // Check if the file exists
    const fileExists = fs.existsSync(filePath)

    if (fileExists) {
      // Read the file content if it exists
      const fileContent = fs.readFileSync(filePath, 'utf8')
      const apiSchema = JSON.parse(fileContent)

      // write the API schema to a file
      const success = writeApiSchema(apiSchema)
      if (!success) {
        return res.status(500).json({ error: 'Failed to set API schema' })
      }

      const resData = getPathAndMethod(apiSchema)
      if (!resData) {
        return res.status(500).json({ error: 'Failed to get path and method from API schema' })
      }

      console.log(' - Paths and methods sent in request body')
      res.json(resData)
    } else {
      console.error(` - Schema '${schemaName}' not found `)
      res.status(404).json({ error: `Schema '${schemaName}' not found ` })
    }
  } catch (error) {
    console.error(' - Error reading schema file:', error)
    res.status(500).json({ error: `Error fetching schema '${schemaName}'` })
  }
})

// Fetch schema from URL and add to database
router.post('/fetch', async function (req, res, next) {
  console.log('Getting API schema...')

  const sutInfo = req.body

  // Ensure the request body has a name property (for the schema)
  if (!(Object.prototype.hasOwnProperty.call(sutInfo, 'name')) || sutInfo.name.trim() === '') {
    console.error(' - Error: no name specified for the schema')
    return res.status(400).json({ error: 'No API schema name specified' })
  }

  if (!sutInfo || !sutInfo.address) {
    return res.status(400).json({ error: 'Address not provided in request data' })
  }

  const url = sutInfo.address

  try {
    const response = await axios.get(url)
    if (response.status !== 200) {
      console.log(` - Failed to fetch API schema from ${url}`)
      return res.status(response.status).json({ error: `Failed to fetch API schema from '${url}'` })
    }
    const apiSchema = response.data

    // Ensure that the API schema follows the Swagger 2.0 specification (feature-service is invalid?)
    // if (!validateApiSchema(apiSchema)) {
    //   console.log(` - The API schema from '${url}' does not follow the Swagger 2.0 specification`)
    //   return res.status(400).json({ error: 'Invalid API schema, does not follow the Swagger 2.0 specification' })
    // }

    // write the API schema to a file
    const success = writeApiSchema(apiSchema)
    if (!success) {
      return res.status(500).json({ error: 'Failed to set API schema' })
    }

    const resData = getPathAndMethod(apiSchema)
    if (!resData) {
      return res.status(500).json({ error: 'Failed to get path and method from API schema' })
    }

    // Check if schema name exists in DB
    const exists = await apiSchemaExists(req.body.name)
    if (!exists) {
      console.log(' - New schema, uploading to DB')
      addApiSchema(generateId(), apiSchema, req.body.name)
    } else {
      console.log(' - Schema already exists in DB')
    }

    console.log(' - Paths and methods sent in request body')
    return res.status(201).json(resData)
  } catch (error) {
    console.error(` - Error fetching API schema from '${url}':`, error.message)
    return res.status(500).json({ error: `Error when fetching API schema from ${url}` })
  }
})

// Set schema trough file upload and add to database
router.post('/set', uploadSchema.single('file'), async function (req, res, next) {
  console.log('Setting API schema')

  // Ensure the request body has a name property (for the schema)
  if (!(Object.prototype.hasOwnProperty.call(req.body, 'name')) || req.body.name.trim() === '') {
    console.error(' - Error: no name specified for the schema')
    return res.status(400).json({ error: 'No API schema name specified' })
  }

  if (!req.file) {
    console.log(' - Error: no file uploaded')
    return res.status(400).json({ error: 'No file uploaded' })
  }
  const filePath = req.file.path
  console.log(` - API schema saved to '${filePath}'`)

  const apiSchema = readApiSchema(filePath)
  if (!apiSchema) {
    return res.status(500).json({ error: 'Failed to read API schema' })
  }

  // Ensure that the API schema follows the Swagger 2.0 specification (feature-service is invalid?)
  // if (!validateApiSchema(apiSchema)) {
  //   console.log(' - Invalid API schema in request body, does not follow the Swagger 2.0 specification')
  //   return res.status(400).json({ error: 'Invalid API schema in request body, does not follow the Swagger 2.0 specification' })
  // }

  const resData = getPathAndMethod(apiSchema)
  if (!resData) {
    return res.status(500).json({ error: 'Failed to get path and method from API schema' })
  }

  // Check if schema name exists in DB
  const exists = await apiSchemaExists(req.body.name)
  if (!exists) {
    console.log(' - New schema, uploading to DB')
    addApiSchema(generateId(), apiSchema, req.body.name)
  } else {
    console.log(' - Schema already exists in DB')
  }

  console.log(' - Paths and methods sent in request body')
  return res.status(201).json(resData)
})

module.exports = router
