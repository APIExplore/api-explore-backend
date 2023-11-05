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
            type: 'string'
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
  return validate(callSequence)
}

module.exports = validateCallSequence
