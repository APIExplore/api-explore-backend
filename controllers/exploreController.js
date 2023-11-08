const axios = require('axios')
const { Server } = require('socket.io')

const { readApiSchema } = require('../utils/apiSchemaUtils')

const io = new Server(process.env.SOCKET || '3001')

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
          endpoint: path,
          parameters: params,
          requestBody: {}
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
async function sendApiCallToSut (apiCall) {
  try {
    // Get formatted timestamp
    apiCall.date = getDate()

    // Call the SUT
    const response = await axios[apiCall.method](apiCall.url)
    apiCall.response = {
      status: response.status,
      date: getDate(),
      data: response.data
    }

    console.log(` - Success: ${apiCall.operationId} ${apiCall.method} '${apiCall.url}' ${response.status}`)

    return apiCall
  } catch (error) {
    console.error(` - Failure: ${apiCall.operationId} ${apiCall.method} '${apiCall.url}' ${error.response.status}`)
    if (error.response) {
      apiCall.response = {
        status: error.response.status,
        date: getDate(),
        data: error.response.data
      }

      return apiCall
    }
    apiCall.error = error
    return apiCall
  }
}

function sendApiCallOverSocket (apiCall) {
  io.on('connection', (socket) => {
    socket.emit('apiCall', apiCall)
  })
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

  const dayOfWeek = daysOfWeek[timestamp.getDay()]
  const day = timestamp.getDate()
  const month = months[timestamp.getMonth()]
  const year = timestamp.getFullYear()
  const hours = timestamp.getHours()
  const minutes = timestamp.getMinutes()
  const seconds = timestamp.getSeconds()
  const milliseconds = timestamp.getMilliseconds()

  return `${dayOfWeek}, ${day} ${month} ${year} ${hours}:${minutes}:${seconds}:${milliseconds}`
}

module.exports = { buildApiCalls, sendApiCallToSut, sendApiCallOverSocket }
