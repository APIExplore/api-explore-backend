const Ajv = require('ajv')
const ajv = new Ajv()

const callSequenceSchema = {
  type: 'object',
  properties: {
    callSequence: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: {
            type: 'string'
          },
          method: {
            type: 'string',
            enum: ['get', 'post', 'delete', 'put']
          }
        },
        required: ['path', 'method']
      }
    }
  },
  required: ['callSequence']
}

const validate = ajv.compile(callSequenceSchema)

function validateCallSequence (callSequence) {
  if (validate(callSequence)) {
    return true
  }

  console.error(' - Invalid API call sequence')
  console.error(ajv.errorsText(validate.errors))
  return false
}

module.exports = validateCallSequence
