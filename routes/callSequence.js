const express = require('express')
const router = express.Router()

const db = require('../firebase/data')
const { schemaInfo } = require('../routes/apiSchema')

router.get('/fetch', async function (req, res, next) {
  if (!schemaInfo.id || !schemaInfo.name) {
    console.log('Fetching all API call sequences...')
    console.error(' - Error: API schema has not been fetched and set')
    return res.status(400).json({ error: 'API schema has not been fetched and set' })
  }

  const schemaName = schemaInfo.name
  console.log(`fetching all API call sequences of schema '${schemaName}'`)

  const schemaId = await db.getIdByName(db.collections.apiSchemas, schemaName)
  const callSequences = await db.getApiSequencesBySchemaId(schemaId)
  const sequenceNames = []
  for (const sequence of callSequences) {
    sequenceNames.push({ name: sequence.name })
  }

  return res.json(sequenceNames)
})

router.get('/fetch/:sequenceName', async function (req, res, next) {
  // Ensure a schema is active
  if (!schemaInfo.id || !schemaInfo.name) {
    console.log('Fetching API call sequence...')
    console.error(' - Error: API schema has not been fetched and set')
    return res.status(400).json({ error: 'API schema has not been fetched and set' })
  }

  const schemaName = schemaInfo.name
  const sequenceName = req.params.sequenceName
  console.log(`Fetching API call sequence '${sequenceName}' from '${schemaName}'...`)

  try {
    const schemaId = schemaInfo.id

    const match = await db.docWithNameAndSchemaIdExists(db.collections.apiCallSequences, schemaId, sequenceName)
    if (match) {
      const sequenceId = await db.getSequenceId(schemaId, sequenceName)
      const apiCalls = await db.getApiCallsBySequenceId(sequenceId)
      if (!apiCalls) {
        return res.status(500).json({ error: `Failed to fetch API call sequence '${sequenceName}':${schemaId}` })
      }
      return res.json(apiCalls)
    } else {
      return res.status(404).json({ error: `Sequence '${sequenceName}' not found` })
    }
  } catch (error) {
    console.error(` - Error fetching API call sequence '${sequenceName}':`, error)
    return res.status(500).json({ error: `Error fetching API call sequence '${sequenceName}'` })
  }
})

module.exports = router
