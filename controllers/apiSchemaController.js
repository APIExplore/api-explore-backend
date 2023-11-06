function getPathsAndMethods (apiSchema) {
  const result = { }
  try {
    if (apiSchema && apiSchema.paths) {
      for (const path in apiSchema.paths) {
        const methods = apiSchema.paths[path]
        result[path] = {}

        for (const method in methods) {
          const operation = methods[method]
          result[path][method] = { operationId: operation.operationId }
        }
      }

      return result
    }
  } catch (error) {
    console.error(' - Error extracting paths and methods from API schema: ', error.message)
    return null
  }
}

module.exports = getPathsAndMethods
