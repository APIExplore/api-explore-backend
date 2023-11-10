const fs = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '../', 'apiSchemas', 'apiSchema.json')

function readApiSchema () {
  try {
    const schemaData = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(schemaData)
  } catch (error) {
    console.error(' - Error reading API schema: ', error.message)
    return null
  }
}

function writeApiSchema (apiSchema) {
  try {
    const schemaString = JSON.stringify(apiSchema, null, 2)
    fs.writeFileSync(filePath, schemaString)
    console.log(` - API schema saved to '${filePath}'`)
    return true
  } catch (error) {
    console.error(' - Error writing API schema: ', error.message)
    return false
  }
}

module.exports = { readApiSchema, writeApiSchema }
