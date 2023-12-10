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
            params = call.params
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

// Function for sending single API calls to SUT
async function sendApiCallToSut (apiCall) {
  let dateBefore = new Date()

  try {
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
    dateBefore = new Date()
    const response = await axios(axiosConfig)
    const dateAfter = new Date()

    console.log(` - Success: ${apiCall.operationId} ${apiCall.method} '${apiCall.url}' ${response.status}`)
    const size = parseInt(response.headers['content-length'], 10)
    apiCall.date = getTimestamp(dateBefore)
    apiCall.response = {
      status: response.status,
      date: getTimestamp(dateAfter),
      contentType: response.headers['content-type'] ? response.headers['content-type'] : 'none specified',
      data: response.data,
      size: size || 0
    }

    // Calculate call duration
    apiCall.duration = dateAfter - dateBefore

    return apiCall
  } catch (error) {
    apiCall.date = getTimestamp(dateBefore)
    const dateAfter = new Date()

    try {
      console.error(` - Failure: ${apiCall.operationId} ${apiCall.method} '${apiCall.url}' ${error.response.status}`)
    } catch (error) {
      console.error(' - Error: Cannot connect to the SUT, ensure the correct SUT is running')
      return null
    }

    const size = parseInt(error.response.headers['content-length'], 10)
    if (error.response) {
      apiCall.response = {
        status: error.response.status,
        date: getTimestamp(dateAfter),
        contentType: error.response.headers['content-type'] ? error.response.headers['content-type'] : 'application/octet-stream',
        data: error.response.data,
        size: size || 0
      }
      apiCall.duration = dateAfter - dateBefore
    }

    return apiCall
  }
}

function sendApiCallOverSocket (apiCall) {
  io.emit('apiCall', apiCall)
}

function compareCallSequence (prevCallSequence, curCallSequence) {
  console.log('Comparing results with previous sequence...')
  const warnings = []

  if (prevCallSequence.length !== curCallSequence.length) {
    console.log(` - The length of the call sequence has changed by ${curCallSequence.length - prevCallSequence.length} call(s)`)
    warnings.push({ warning: `The length of the call sequence has changed by ${curCallSequence.length - prevCallSequence.length} call(s)` })
    return warnings
  }

  for (let i = 0; i < curCallSequence.length; i++) {
    const callA = curCallSequence[i]
    const callB = prevCallSequence[i]

    if (callA.operationId !== callB.operationId) {
      console.log(` - Operation of API call #${i + 1} has changed from '${callB.operationId}' to '${callA.operationId}'`)
      warnings.push({ warning: `Operation of API call #${i + 1} has changed from '${callB.operationId}' to '${callA.operationId}'` })
      continue
    }

    if (callA.response.status !== callB.response.status) {
      console.log(` - Response status of API call #${i + 1} '${callA.operationId}' has changed from '${callB.response.status}' to '${callA.response.status}'`)
      warnings.push({ warning: `Response status of API call #${i + 1} '${callA.operationId}' has changed from '${callB.response.status}' to '${callA.response.status}'` })
    }

    if (!jsonEqual(callA.response.data, callB.response.data)) {
      console.log(` - Response data of API call #${i + 1} '${callA.operationId}' has changed'`)
      warnings.push({ warning: `Response data of API call #${i + 1} '${callA.operationId}' has changed` })
    }
  }

  return warnings
}

function analyzeCallSequence (callSequence) {
  console.log('Analyzing call sequence relationships...')
  const stateMutations = []

  function assignRelationship (call, relationshipType, value) {
    call.relationships = call.relationships || {}
    call.relationships[relationshipType] = call.relationships[relationshipType] || []
    call.relationships[relationshipType].push(value)
  }

  for (let i = 0; i < callSequence.length - 1; i++) {
    const call1 = callSequence[i]
    const remainingCalls = callSequence.slice(i + 1)

    // Find the second occurrence of the same operation
    const call2 = remainingCalls.find((call2) => call1.operationId === call2.operationId)

    if (call2) {
      const ind2 = callSequence.map((e) => e.date).indexOf(call2.date)

      const res1 = { status: call1.response.status, data: call1.response.data }
      const res2 = { status: call2.response.status, data: call2.response.data }

      if (call1.method === 'get') {
        if (jsonEqual(res1, res2)) {
          assignRelationship(call1, 'responseEquality', 'start')
          assignRelationship(call2, 'responseEquality', 'end')
          console.log(` - Found response equality between #${i + 1} ${call1.operationId} and #${ind2 + 1} ${call2.operationId}`)
        } else {
          assignRelationship(call1, 'responseInequality', 'start')
          assignRelationship(call2, 'responseInequality', 'end')
          console.log(` - Found response inequality between #${i + 1} ${call1.operationId} and #${ind2 + 1} ${call2.operationId}`)

          assignRelationship(call1, 'stateMutation', 'start')
          assignRelationship(call2, 'stateMutation', 'end')
          console.log(` - Found state mutation between #${i + 1} ${call1.operationId} and #${ind2 + 1} ${call2.operationId}`)

          stateMutations.push({ start: call1, end: call2, ind1: i, ind2 })
        }
      } else {
        if (jsonEqual(res1, res2)) {
          assignRelationship(call1, 'responseEquality', 'start')
          assignRelationship(call2, 'responseEquality', 'end')
          console.log(` - Found response equality between #${i + 1} ${call1.operationId} and #${ind2 + 1} ${call2.operationId}`)
        } else {
          assignRelationship(call1, 'responseInequality', 'start')
          assignRelationship(call2, 'responseInequality', 'end')
          console.log(` - Found response inequality between #${i + 1} ${call1.operationId} and #${ind2 + 1} ${call2.operationId}`)
        }
      }
    }

    if (parseInt(call1.response.status) >= 500) {
      assignRelationship(call1, 'fuzz', 'end')
      console.log(` - Found fuzz in #${i} ${call1.operationId}`)
    }
  }

  for (let i = 0; i < stateMutations.length - 1; i++) {
    const mut1 = stateMutations[i]
    const mut2 = stateMutations[i + 1]

    const res1 = { status: mut1.start.response.status, data: mut1.start.response.data }
    const res2 = { status: mut2.end.response.status, data: mut2.end.response.data }

    if (jsonEqual(res1, res2)) {
      assignRelationship(callSequence[mut1.ind1], 'stateIdentity', 'start')
      assignRelationship(callSequence[mut1.ind2], 'stateIdentity', 'mid')
      assignRelationship(callSequence[mut2.ind2], 'stateIdentity', 'end')
      console.log(` - Found state identity between #${mut1.ind1 + 1} ${mut1.start.operationId}, #${mut1.ind2 + 1} ${mut1.end.operationId} and #${mut2.ind2 + 1} ${mut2.end.operationId}`)
    }
  }

  return callSequence
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

function jsonEqual (a, b) {
  if (typeof a !== 'object' || typeof b !== 'object') {
    return a === b
  }

  const keysA = Object.keys(a).sort()
  const keysB = Object.keys(b).sort()

  if (keysA.length !== keysB.length) {
    return false
  }

  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i]
    const valueA = a[key]
    const valueB = b[key]

    if (!jsonEqual(valueA, valueB)) {
      return false
    }
  }

  return true
}

function getTimestamp (date) {
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]

  const dayOfWeek = daysOfWeek[date.getDay()]
  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const seconds = date.getSeconds()
  const milliseconds = date.getMilliseconds()

  return `${dayOfWeek}, ${day} ${month} ${year} ${hours}:${minutes}:${seconds}:${milliseconds}`
}

module.exports = {
  buildApiCalls,
  buildApiCallsRandParams,
  sendApiCallToSut,
  sendApiCallOverSocket,
  compareCallSequence,
  analyzeCallSequence
}
