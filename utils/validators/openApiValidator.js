// Feature-service spec is not valid swagger 2.0?

const { openapi } = require('@apidevtools/openapi-schemas')
const ZSchema = require('z-schema')

const validator = new ZSchema()

function validateApiSchema (apiSchema) {
  const schemaSpec = getSchemaSpec(apiSchema)

  if (!schemaSpec) {
    return { isValid: false, warnings: [{ warning: 'API schema issue: Invalid specification of version in schema' }] }
  }

  const isValid = validator.validate(apiSchema, schemaSpec)
  const warnings = []

  for (const warn of validator.getLastErrors()) {
    if (warn.message.startsWith('Reference could not be resolved')) {
      continue
    }
    warnings.push({ warning: 'API schema issue: ' + warn.message })
  }

  return { isValid, warnings }
}

function getSchemaSpec (apiSchema) {
  const version = apiSchema.swaggerVersion || apiSchema.swagger || apiSchema.openapi

  if (version.startsWith('1')) {
    return openapi.v1
  } else if (version.startsWith('2')) {
    return openapi.v2
  } else if (version.startsWith('3.1')) {
    return openapi.v31
  } else if (version.startsWith('3')) {
    return openapi.v3
  }

  return null
}

module.exports = validateApiSchema
