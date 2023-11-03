/**
 * Basic error handling middleware
 */

const createError = require('http-errors')

// Catch 404 and forward to error handler
function forward404 (req, res, next) {
  next(createError(404))
}

// Error handler
function errorHandler (err, req, res, next) {
  // Set locals, providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // Send error message
  res.status(err.status || 500)
  res.send('Internal Server Error')
}

module.exports = { forward404, errorHandler }
