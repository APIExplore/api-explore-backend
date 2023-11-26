const querystring = require('querystring')
const axios = require('axios')
const { Server } = require('socket.io')

const { readApiSchema } = require('../utils/apiSchemaUtils')

const io = new Server(process.env.SOCKET || '3001')
io.on('connection', (socket) => {
  console.log('API call socket is on...')
})

// Common function for building API calls
function buildApiCallsCommon (callSequence, useRandomParams) {
  const apiCalls = []
  const apiSchema = readApiSchema()

  try {
    const basePath = apiSchema.basePath.endsWith('/')
      ? apiSchema.basePath.slice(0, -1)
      : apiSchema.basePath

    const address = apiSchema.schemes[0] + '://' + apiSchema.host + basePath

    for (const call of callSequence) {
      const path = call.path
      const method = call.method
      const operation = apiSchema.paths[path][method]
      if (operation) {
        let params = []
        if (operation.parameters) {
          if (useRandomParams) {
            params = operation.parameters.map((param) => ({
              type: param.type,
              in: param.in,
              name: param.name,
              value: param.enum
                ? pickRandomValueFromEnum(param.enum)
                : generateRandomValue(param.type)
            }))
          } else {
            params = call.parameters
          }
        }

        apiCalls.push({
          url: address + assignPathParameters(path, params),
          operationId: operation.operationId ? operation.operationId : path,
          method,
          endpoint: path,
          parameters: params,
          requestBody: assignRequestBodyParameters(params)
        })
      }
    }

    return apiCalls
  } catch (error) {
    console.error(' - Error building API calls (make sure that the correct schema is set): ', error.message)
    return null
  }
}

// Function for building API calls
function buildApiCalls (callSequence) {
  return buildApiCallsCommon(callSequence, false)
}

// Function for building API calls with random parameters
function buildApiCallsRandParams (callSequence) {
  return buildApiCallsCommon(callSequence, true)
}

// Send call sequence to SUT
async function sendApiCallToSut (apiCall) {
  try {
    // Get formatted timestamp
    apiCall.date = getDate()

    const axiosConfig = {
      method: apiCall.method,
      url: apiCall.url
    }

    const { formData } = apiCall.requestBody

    // Check if the API call contains formData
    if (Object.keys(formData).length > 0) {
      axiosConfig.data = querystring.stringify(formData)
      axiosConfig.headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }

    // Call the SUT
    const response = await axios(axiosConfig)

    // Record response data
    const responseDate = getDate()
    apiCall.response = {
      status: response.status,
      date: responseDate,
      data: response.data
    }

    // Calculate call duration
    const start = new Date(apiCall.date)
    const end = new Date(apiCall.response.date)
    apiCall.duration = end - start

    console.log(` - Success: ${apiCall.operationId} ${apiCall.method} '${apiCall.url}' ${response.status}`)

    return apiCall
  } catch (error) {
    const responseDate = getDate()
    try {
      console.error(` - Failure: ${apiCall.operationId} ${apiCall.method} '${apiCall.url}' ${error.response.status}`)
    } catch (error) {
      console.error(' - Error: Cannot connect to the SUT, ensure the correct SUT is running')
      return null
    }

    if (error.response) {
      apiCall.response = {
        status: error.response.status,
        date: responseDate,
        data: error.response.data
      }

      const start = new Date(apiCall.date)
      const end = new Date(apiCall.response.date)
      apiCall.duration = end - start

      return apiCall
    }
    apiCall.error = error
    return apiCall
  }
}

function sendApiCallOverSocket (apiCall) {
  io.emit('apiCall', apiCall)
}

// Helper functions

function assignPathParameters (path, parameters) {
  let isFirstQuery = true
  for (const param of parameters) {
    switch (param.in) {
      case 'path':
        path = path.replace(`{${param.name}}`, param.value)
        break
      case 'query':
        if (isFirstQuery) {
          path = `${path}?${param.name}=${param.value}`
          isFirstQuery = false
        } else {
          path = `${path}&${param.name}=${param.value}`
        }
        break
      default:
        break
    }
  }
  return path
}

function assignRequestBodyParameters (parameters) {
  const formDataParams = {}

  for (const param of parameters) {
    switch (param.in) {
      case 'formData':
        formDataParams[param.name] = param.value
        break
      default:
        break
    }
  }

  return {
    formData: formDataParams
  }
}

function generateRandomValue (type) {
  switch (type) {
    case 'integer':
      return Math.floor(Math.random() * 1000)
    case 'string':
      return (Math.random() + 1).toString(36).substring(7)
    case 'boolean':
      return Math.random() < 0.5
    default:
      return null
  }
}

function pickRandomValueFromEnum (enumValues) {
  return enumValues[Math.floor(Math.random() * enumValues.length)]
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

module.exports = { buildApiCalls, buildApiCallsRandParams, sendApiCallToSut, sendApiCallOverSocket }
