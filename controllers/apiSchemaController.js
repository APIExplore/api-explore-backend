function getSchemaProperties (apiSchema) {
  const result = { paths: {}, definitions: {} }

  try {
    if (apiSchema && apiSchema.paths) {
      // Extract all paths
      for (const path in apiSchema.paths) {
        const methods = apiSchema.paths[path]
        result.paths[path] = {}

        // Extract needed path properties
        for (const method in methods) {
          const operation = methods[method]
          if (operation) {
            if (operation.operationId) {
              result.paths[path][method] = { operationId: operation.operationId }
            } else {
              result.paths[path][method] = { operationId: path }
            }
            if (operation.parameters) {
              result.paths[path][method].parameters = operation.parameters
            }
            if (operation.responses && operation.responses['200'] && operation.responses['200'].schema && operation.responses['200'].schema.$ref) {
              result.paths[path][method].definitionRef = operation.responses['200'].schema.$ref
            }
          }
        }
      }

      if (apiSchema.definitions) {
        result.definitions = apiSchema.definitions
      }

      return result
    }
  } catch (error) {
    console.error(
      ' - Error extracting paths, methods and definitions from API schema: ',
      error.message
    )
    return null
  }
}

module.exports = getSchemaProperties
