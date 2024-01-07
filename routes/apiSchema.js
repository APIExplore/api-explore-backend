/**
 * Routes for getting API schema
 */

const express = require('express')
const router = express.Router()
const axios = require('axios')

const validateApiSchema = require('../utils/validators/openApiValidator')
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
  if (!schemaName || schemaName.trim() === '') {
    console.log('Fetching API schema...')
    console.error(' - Error: no name specified for the schema')
    return res.status(400).json({ error: 'No API schema name specified' })
  }

  console.log(`Fetching API schema '${schemaName}'...`)

  try {
    // Check if schema by name exists
    if (await db.apiSchemaExists(schemaName)) {
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

      const { isValid, warnings } = validateApiSchema(apiSchema)

      if (!isValid) {
        resData.warnings = warnings
      }

      // Send data in response
      console.log(' - Paths, methods and definitions sent in request body')
      res.status(201).json(resData)
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
  const schemaName = req.body.name
  if (!schemaName || schemaName.trim() === '') {
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
      if (!apiSchema.paths) {
        return res.status(400).json({ error: 'Failed to read API schema, ensure correct JSON structure in the provided file' })
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

    if (!resData) {
      console.error(' - Error: failed to get API schema properties, ensure a correct API schema was provided')
      return res.status(400).json({ error: 'Failed to get API schema properties, ensure a correct API schema was provided' })
    }

    await db.addApiSchema(apiSchema, schemaName)

    schemaInfo.id = await db.getIdByName(db.collections.apiSchemas, schemaName)
    schemaInfo.name = schemaName

    const { isValid, warnings } = validateApiSchema(apiSchema)

    if (!isValid) {
      resData.warnings = warnings
    }

    console.log(' - Paths, methods and definitions sent in request body')
    return res.status(201).json(resData)
  } catch (error) {
    if (isUpload) {
      console.error(` - Error setting API schema through file upload: ${error.message}`)
      return res.status(400).json({ error: 'Error setting API schema through file upload', message: error.message })
    }
    console.error(` - Failed to fetch API schema from URL '${req.body.address}: ${error.message}`)
    return res.status(400).json({ error: `Failed to fetch API schema from URL '${req.body.address}'`, message: error.message })
  }
}

// Fetch and set schema from URL and add to database
router.post('/fetch', async function (req, res, next) {
  return setApiSchema(req, res, next, false)
})

// Set schema through file upload and add to database
router.post('/set', async function (req, res, next) {
  uploadSchema.single('file')(req, res, (err) => {
    if (err) {
      console.error(' - Error:', err.message)
      return res.status(err.status || 500).json({ error: err.message })
    }

    return setApiSchema(req, res, next, true)
  })
})

router.put('/rename/:schemaName/:newSchemaName', async function (req, res, next) {
  const schemaName = req.params.schemaName
  const newSchemaName = req.params.newSchemaName
  if (!schemaName || !newSchemaName || schemaName.trim() === '' || newSchemaName.trim() === '') {
    console.log('Renaming API schema...')
    console.error(' - Error: no name specified for the schema')
    return res.status(400).json({ error: 'No API schema name specified' })
  }

  console.log(`Renaming API schema '${schemaName}' to '${newSchemaName}'...`)

  try {
    // Check if schema by name exists
    if (await db.apiSchemaExists(schemaName)) {
      const schemaId = await db.getIdByName(db.collections.apiSchemas, schemaName)
      if (!schemaId) {
        return res.status(500).json({ error: `Failed to get ID of schema '${schemaName}'` })
      }

      const success = await db.renameApiSchema(schemaId, newSchemaName)
      if (!success) {
        return res.status(500).json({ error: `Failed to rename API schema '${schemaName}'` })
      }

      res.status(201).json({ success: true })
    } else {
      console.error(` - Schema '${schemaName}' does not exist `)
      res.status(404).json({ error: `Schema '${schemaName}' does not exist ` })
    }
  } catch (error) {
    console.error(` - Error renaming schema '${schemaName}':`, error)
    res.status(500).json({ error: `Error renaming schema '${schemaName}'` })
  }
})

router.delete('/delete/:schemaName', async function (req, res, next) {
  const schemaName = req.params.schemaName
  if (!schemaName || schemaName.trim() === '') {
    console.log('Fetching API schema...')
    console.error(' - Error: no name specified for the schema')
    return res.status(400).json({ error: 'No API schema name specified' })
  }

  console.log(`Fetching API schema '${schemaName}'...`)

  try {
    // Check if schema by name exists
    if (await db.apiSchemaExists(schemaName)) {
      const schemaId = await db.getIdByName(db.collections.apiSchemas, schemaName)
      if (!schemaId) {
        return res.status(500).json({ error: `Failed to get ID of schema '${schemaName}'` })
      }

      const success = await db.deleteApiSchema(schemaId)
      if (!success) {
        return res.status(500).json({ error: `Failed to delete API schema '${schemaName}'` })
      }

      res.status(201).json({ success: true })
    } else {
      console.error(` - Schema '${schemaName}' does not exist `)
      res.status(404).json({ error: `Schema '${schemaName}' does not exist ` })
    }
  } catch (error) {
    console.error(` - Error deleting schema '${schemaName}':`, error)
    res.status(500).json({ error: `Error deleting schema '${schemaName}'` })
  }
})

module.exports = { router, schemaInfo }
