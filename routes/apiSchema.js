/**
 * Routes for getting API schema
 */

const express = require('express')
const router = express.Router()
const axios = require('axios')
const { v4: generateId } = require('uuid')

// const validateApiSchema = require('../utils/validators/apiSchemaV2Validator')
const { readApiSchema, writeApiSchema } = require('../utils/apiSchemaUtils')
const getSchemaProperties = require('../controllers/apiSchemaController')
const uploadSchema = require('../middleware/apiSchemaMiddleware.js')
const db = require('../firebase/data')

// Records data on active schema when setting/fetching
const schemaInfo = { id: null, name: null }

// Fetch all schemas from DB
router.get('/fetch', async function (req, res, next) {
  console.log('Fetching all API schemas...')

  const apiSchemas = await db.getAllApiInfo(db.collections.apiSchemas)
  const schemaNames = []
  for (const schema of apiSchemas) {
    schemaNames.push({ name: schema.name })
  }

  return res.json(schemaNames)
})

// Fetch schema with name from DB
router.get('/fetch/:schemaName', async function (req, res, next) {
  const schemaName = req.params.schemaName
  console.log(`Fetching API schema '${schemaName}'...`)

  try {
    // Check if schema by name exists
    if (await db.docWithNameExists(db.collections.apiSchemas, schemaName)) {
      // Fetch schema from DB
      const apiSchemaData = await db.getApiInfoByName(db.collections.apiSchemas, schemaName)
      if (!apiSchemaData) {
        return res.status(500).json({ error: `Failed to fetch API schema '${schemaName}'` })
      }

      const apiSchema = apiSchemaData.apiSchema

      // save a local copy of the schema
      const success = writeApiSchema(apiSchema)
      if (!success) {
        return res.status(500).json({ error: 'Failed to save API schema locally' })
      }

      // Extract information useful information from schema
      const resData = getSchemaProperties(apiSchema)
      if (!resData) {
        return res.status(500).json({ error: 'Failed to get path and method from API schema' })
      }

      // Ensure schema ID was fetched correctly from DB and save
      schemaInfo.id = await db.getIdByName(db.collections.apiSchemas, schemaName)
      if (!schemaInfo.id) {
        return res.status(500).json({ error: `Failed to get ID of schema '${schemaName}'` })
      }
      schemaInfo.name = schemaName

      // Send data in response
      console.log(' - Paths, methods and definitions sent in request body')
      res.json(resData)
    } else {
      console.error(` - Schema '${schemaName}' does not exist `)
      res.status(404).json({ error: `Schema '${schemaName}' does not exist ` })
    }
  } catch (error) {
    console.error(` - Error fetching schema '${schemaName}':`, error)
    res.status(500).json({ error: `Error fetching schema '${schemaName}'` })
  }
})

// Common function for fetching and setting API schema
async function setApiSchema (req, res, next, isUpload) {
  const schemaName = req.body.name.trim()

  // Ensure the request body has a name property (for the schema)
  if (!schemaName) {
    console.error(' - Error: no name specified for the schema')
    return res.status(400).json({ error: 'No API schema name specified' })
  }

  try {
    let apiSchema
    let resData

    if (isUpload) {
      console.log('Setting API schema from file upload')

      if (!req.file) {
        console.log(' - Error: no file uploaded')
        return res.status(400).json({ error: 'No file uploaded' })
      }

      const filePath = req.file.path
      console.log(` - API schema saved to '${filePath}'`)

      apiSchema = readApiSchema(filePath)

      if (!apiSchema) {
        return res.status(500).json({ error: 'Failed to read API schema' })
      }

      resData = getSchemaProperties(apiSchema)
    } else {
      console.log('Fetching API schema from URL...')

      const sutInfo = req.body

      if (!sutInfo || !sutInfo.address) {
        return res.status(400).json({ error: 'Address not provided in request data' })
      }

      const url = sutInfo.address
      const response = await axios.get(url)

      if (response.status !== 200) {
        console.log(` - Failed to fetch API schema from ${url}`)
        return res.status(response.status).json({ error: `Failed to fetch API schema from '${url}'` })
      }

      apiSchema = response.data

      const success = writeApiSchema(apiSchema)
      if (!success) {
        return res.status(500).json({ error: 'Failed to set API schema' })
      }

      resData = getSchemaProperties(apiSchema)
    }

    let schemaId = null

    // Check if schema name exists in DB
    const existsInDb = await db.docWithNameExists(db.collections.apiSchemas, schemaName)
    if (!existsInDb) {
      console.log(' - New schema, uploading to DB')
      schemaId = generateId()
      db.addApiSchema(schemaId, apiSchema, schemaName)
    } else {
      schemaId = await db.getIdByName(db.collections.apiSchemas, schemaName)

      if (!schemaId) {
        return res.status(500).json({ error: 'Failed to get API schema ID from DB' })
      }

      console.log(' - Schema already exists in DB')
    }

    schemaInfo.id = schemaId
    schemaInfo.name = schemaName

    console.log(' - Paths, methods and definitions sent in request body')
    return res.status(201).json(resData)
  } catch (error) {
    console.error(` - Error handling API schema: ${error.message}`)
    return res.status(500).json({ error: 'Error handling API schema' })
  }
}

// Fetch and set schema from URL and add to database
router.post('/fetch', async function (req, res, next) {
  return await setApiSchema(req, res, next, false)
})

// Set schema through file upload and add to database
router.post('/set', uploadSchema.single('file'), async function (req, res, next) {
  return await setApiSchema(req, res, next, true)
})

module.exports = { router, schemaInfo }
