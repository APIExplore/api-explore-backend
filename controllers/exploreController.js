const axios = require('axios')

const { readApiSchema } = require('../utils/apiSchemaUtils')

// Assign random values to endpoint parameters (currently just strings and integers)
function buildApiCalls (callSequence) {
  const apiCalls = []

  try {
    const apiSchema = readApiSchema()
    const address = apiSchema.schemes[0] + '://' + apiSchema.host
    // Randomize call path parameters
    for (const call of callSequence) {
      // Extract parameters field from schema
      const method = apiSchema.paths[call.path][call.method]
      const params = method.parameters.map(param => ({
        name: param.name,
        type: param.type
      }))

      apiCalls.push({
        operationId: method.operationId,
        address,
        method: call.method,
        path: randomizePathParameters(call.path, params),
        parameters: params
      })
    }

    return apiCalls
  } catch (error) {
    return null
  }
}

// Send call sequence to SUT
async function sendApiCall (apiCall) {
  const url = apiCall.address + apiCall.path
  try {
    // Get formatted timestamp
    apiCall.date = getDate()

    // Call the SUT
    const response = await axios[apiCall.method](url)

    const responseData = {
      status: response.status,
      headers: response.headers,
      data: response.data
    }

    console.error(` - Success: ${apiCall.operationId} ${apiCall.method} '${url}' ${response.status}`)
    apiCall.response = responseData

    return apiCall
  } catch (error) {
    console.error(` - Failure: ${apiCall.operationId} ${apiCall.method} '${url}' ${error.response.status}`)
    if (error.response) {
      apiCall.response = { status: error.response.status, headers: error.response.headers, data: error.response.data }
      return apiCall
    }
    apiCall.error = error
    return apiCall
  }
}

// Helper functions

function randomizePathParameters (path, parameters) {
  for (const param of parameters) {
    path = path.replace(`{${param.name}}`, generateRandomValue(param.type))
  }
  return path
}

function generateRandomValue (type) {
  switch (type) {
    case 'integer':
      return Math.floor(Math.random() * 1000)
    case 'string':
      return (Math.random() + 1).toString(36).substring(7)
    default:
      return null
  }
}

function getDate () {
  const timestamp = new Date()

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]

  const dayOfWeek = daysOfWeek[timestamp.getUTCDay()]
  const day = timestamp.getUTCDate()
  const month = months[timestamp.getUTCMonth()]
  const year = timestamp.getUTCFullYear()
  const hours = timestamp.getUTCHours()
  const minutes = timestamp.getUTCMinutes()
  const seconds = timestamp.getUTCSeconds()

  return `${dayOfWeek}, ${day} ${month} ${year} ${hours}:${minutes}:${seconds} GMT`
}

module.exports = { buildApiCalls, sendApiCall }
