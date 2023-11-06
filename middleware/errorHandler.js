/**
 * Basic error handling middleware
 */

const createError = require('http-errors')

// Catch 404 and forward to error handler
function forward404 (req, res, next) {
  next(createError(404))
}

// Error handler
function handleError (err, req, res, next) {
  // Set locals, providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // Send error message
  res.status(err.status || 500)
  console.error(` - ${err}`)
  res.send('Error handling the request')
}

module.exports = { forward404, handleError }
