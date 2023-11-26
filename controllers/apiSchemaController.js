function getSchemaProperties (apiSchema) {
  const result = {}
  try {
    if (apiSchema && apiSchema.paths) {
      // Extract all paths
      for (const path in apiSchema.paths) {
        const methods = apiSchema.paths[path]
        result[path] = {}

        // Extract needed path properties
        for (const method in methods) {
          const operation = methods[method]
          if (operation) {
            if (operation.operationId) {
              result[path][method] = { operationId: operation.operationId }
            } else {
              result[path][method] = { operationId: path }
            }
            if (operation.parameters) {
              result[path][method].parameters = operation.parameters
            }
          }
        }
      }

      return result
    }
  } catch (error) {
    console.error(
      ' - Error extracting paths and methods from API schema: ',
      error.message
    )
    return null
  }
}

module.exports = getSchemaProperties
