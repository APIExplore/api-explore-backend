const express = require('express')
const router = express.Router()

const db = require('../firebase/data')
const { schemaInfo } = require('../routes/apiSchema')

router.get('/fetch', async function (req, res, next) {
  console.log('Fetching all API call sequences...')

  if (!schemaInfo.id || !schemaInfo.name) {
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

  const sequenceName = req.params.sequenceName
  if (!sequenceName || sequenceName.trim() === '') {
    console.log('Fetching API call sequence...')
    console.error(' - Error: no name specified for the sequence')
    return res.status(400).json({ error: 'No call sequence name specified' })
  }

  const schemaName = schemaInfo.name

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

router.put('/rename/:sequenceName/:newSequenceName', async function (req, res, next) {
  const sequenceName = req.params.sequenceName
  const newSequenceName = req.params.newSequenceName
  if (!sequenceName || !newSequenceName || sequenceName.trim() === '' || newSequenceName.trim() === '') {
    console.log('Renaming API call sequence...')
    console.error(' - Error: no name or new name specified for the sequence')
    return res.status(400).json({ error: 'No call sequence name specified' })
  }

  console.log(`Renaming API call sequence '${sequenceName}' to '${newSequenceName}'...`)

  try {
    // Check if schema by name exists
    if (await db.docWithNameAndSchemaIdExists(db.collections.apiCallSequences, schemaInfo.id, sequenceName)) {
      const sequenceId = await db.getSequenceId(schemaInfo.id, sequenceName)
      if (!sequenceId) {
        return res.status(500).json({ error: `Failed to get ID of sequence '${sequenceName}'` })
      }

      const success = await db.renameCallSequence(sequenceId, newSequenceName)
      if (!success) {
        return res.status(500).json({ error: `Failed to rename sequence '${sequenceName}'` })
      }

      res.status(201).json({ success: true })
    } else {
      console.error(` - Sequence '${sequenceName}' does not exist `)
      res.status(404).json({ error: `Sequence '${sequenceName}' does not exist ` })
    }
  } catch (error) {
    console.error(` - Error renaming sequence '${sequenceName}':`, error)
    res.status(500).json({ error: `Error renaming sequence '${sequenceName}'` })
  }
})

router.delete('/delete/:sequenceName', async function (req, res, next) {
  // Ensure a schema is active
  if (!schemaInfo.id || !schemaInfo.name) {
    console.log('Deleting API call sequence...')
    console.error(' - Error: API schema has not been fetched and set')
    return res.status(400).json({ error: 'API schema has not been fetched and set' })
  }

  const sequenceName = req.params.sequenceName
  if (!sequenceName || sequenceName.trim() === '') {
    console.log('Deleting API call sequence...')
    console.error(' - Error: no name specified for the sequence')
    return res.status(400).json({ error: 'No call sequence name specified' })
  }

  const schemaName = schemaInfo.name
  console.log(`Deleting API call sequence '${sequenceName}' from '${schemaName}'...`)

  try {
    const schemaId = schemaInfo.id

    const match = await db.docWithNameAndSchemaIdExists(db.collections.apiCallSequences, schemaId, sequenceName)
    if (match) {
      const sequenceId = await db.getSequenceId(schemaId, sequenceName)
      const success = await db.deleteCallSequence(sequenceId)
      if (!success) {
        return res.status(500).json({ error: `Failed to delete API call sequence '${sequenceName}':${schemaId}` })
      }

      return res.status(201).json({ success: true })
    } else {
      return res.status(404).json({ error: `Sequence '${sequenceName}' not found` })
    }
  } catch (error) {
    console.error(` - Error deleteing API call sequence '${sequenceName}':`, error)
    return res.status(500).json({ error: `Error deleteing API call sequence '${sequenceName}'` })
  }
})

module.exports = router
