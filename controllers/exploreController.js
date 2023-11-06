const axios = require('axios')

const { readApiSchema } = require('../utils/apiSchemaUtils')

// Assign random values to endpoint parameters (currently just strings and integers)
function buildApiCalls (callSequence) {
  const apiCalls = []
  const apiSchema = readApiSchema()

  try {
    const address = apiSchema.schemes[0] + '://' + apiSchema.host

    for (const call of callSequence) {
      const path = call.path
      const method = call.method
      const operation = apiSchema.paths[path][method]

      if (operation) {
        const params = operation.parameters.map((param) => ({
          type: param.type,
          name: param.name,
          value: generateRandomValue(param.type)
        }))

        apiCalls.push({
          url: address + assignPathParameters(path, params),
          operationId: operation.operationId,
          method,
          path,
          parameters: params
        })
      }
    }

    return apiCalls
  } catch (error) {
    console.error(' - Error building API calls: ', error.message)
    return null
  }
}

// Send call sequence to SUT
async function sendApiCall (apiCall) {
  try {
    // Get formatted timestamp
    apiCall.date = getDate()

    // Call the SUT
    const response = await axios[apiCall.method](apiCall.url)

    console.error(` - Success: ${apiCall.operationId} ${apiCall.method} '${apiCall.url}' ${response.status}`)
    apiCall.response = {
      status: response.status,
      headers: response.headers,
      data: response.data
    }

    return apiCall
  } catch (error) {
    console.error(` - Failure: ${apiCall.operationId} ${apiCall.method} '${apiCall.url}' ${error.response.status}`)
    if (error.response) {
      apiCall.response = {
        status: error.response.status,
        headers: error.response.headers,
        data: error.response.data
      }

      return apiCall
    }
    apiCall.error = error
    return apiCall
  }
}

// Helper functions

function assignPathParameters (path, parameters) {
  for (const param of parameters) {
    path = path.replace(`{${param.name}}`, param.value)
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
