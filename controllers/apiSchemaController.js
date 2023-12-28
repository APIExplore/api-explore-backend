function getSchemaProperties (apiSchema) {
  if (!apiSchema) {
    console.error(' - API schema is missing.')
    return null
  }

  const result = { paths: {}, definitions: {} }

  // Set definitions
  result.definitions = apiSchema.definitions || (apiSchema.components && apiSchema.components.schemas) || {}

  // Extract all paths
  for (const path in apiSchema.paths) {
    const methods = apiSchema.paths[path]
    result.paths[path] = {}

    // Extract needed path properties
    for (const method in methods) {
      const operation = methods[method]

      if (!operation) continue

      const pathMethodObj = { operationId: operation.operationId || path, parameters: [] }

      // Set definitionRef
      const response200 = operation.responses && operation.responses['200']
      if (response200 && response200.schema && response200.schema.$ref) {
        pathMethodObj.definitionRef = response200.schema.$ref
      } else if (response200 && response200.content) {
        const content = response200.content
        if (content.schema && content.schema.$ref) {
          pathMethodObj.definitionRef = content.schema.$ref
        }
      }

      // Set parameters
      pathMethodObj.parameters = (operation.parameters || []).map((param) => {
        if (param.schema) {
          const ref = param.schema.$ref || (param.schema.items && param.schema.items.$ref)
          if (ref) {
            return getObjectParameters(param.in, param.required || false, ref, result.definitions)
          }
        }
        return param
      }).flat()

      // Handle requestBody
      if (operation.requestBody && operation.requestBody.content) {
        const requestBodyContent = operation.requestBody.content
        let processedJson = false

        // Try to get "application/json" content type first
        const jsonContentType = requestBodyContent['application/json']
        if (jsonContentType) {
          const ref = jsonContentType.schema?.$ref || (jsonContentType.schema?.items?.$ref)
          if (ref) {
            const params = getObjectParameters('body', true, ref, result.definitions)
            pathMethodObj.parameters = pathMethodObj.parameters.concat(params)
            processedJson = true
          }
        }

        // If "application/json" doesn't exist, pick the first content type available
        if (!processedJson) {
          const firstContentType = Object.values(requestBodyContent)[0]
          if (firstContentType) {
            const ref = firstContentType.schema?.$ref || (firstContentType.schema?.items?.$ref)
            const format = firstContentType.schema?.format
            const type = firstContentType.schema?.type

            if (ref) {
              const params = getObjectParameters('body', true, ref, result.definitions)
              pathMethodObj.parameters = pathMethodObj.parameters.concat(params)
            } else if (format || type) {
              // If no $ref but there is format or type, create a parameter using format as the name (e.g., file data)
              pathMethodObj.parameters.push({
                name: format || type,
                in: 'body',
                required: true,
                type
              })
            }
          }
        }
      }

      result.paths[path][method] = pathMethodObj
    }
  }

  return result
}

// Function for resolving parts of referenced object as individual parameters
function getObjectParameters (paramIn, required, ref, definitions, parentObjectName = '') {
  let params = []

  const trimmed = ref.split('/')
  const key = trimmed[trimmed.length - 1]
  const definition = definitions[key]

  if (definition.properties) {
    const keys = Object.keys(definition.properties)
    for (const k of keys) {
      const paramName = parentObjectName ? parentObjectName + ' ' + k : k

      if (definition.properties[k].$ref) {
        const tempParams = getObjectParameters(paramIn, required, definition.properties[k].$ref, definitions, k)
        params = params.concat(tempParams)
      } else if (definition.properties[k].items && definition.properties[k].items.$ref) {
        const tempParams = getObjectParameters(paramIn, required, definition.properties[k].items.$ref, definitions, k)
        params = params.concat(tempParams)
      } else {
        const param = {
          name: paramName,
          in: paramIn,
          type: definition.properties[k].type || 'none',
          required
        }

        params.push(param)
      }
    }
  }

  return params
}

module.exports = getSchemaProperties
