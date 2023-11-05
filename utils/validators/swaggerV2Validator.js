// Feature-service spec is not valid swagger 2.0?

const { openapiV2 } = require('@apidevtools/openapi-schemas')
const ZSchema = require('z-schema')

const validator = new ZSchema()

function validateApiSchema (apiSchema) {
  const isValid = validator.validate(apiSchema, openapiV2)
  console.log(validator.getLastErrors())
  return isValid
}

module.exports = validateApiSchema
