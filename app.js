const http = require('http')
const express = require('express')
const logger = require('morgan')
const cors = require('cors')
const debug = require('debug')('API-EXPLORE-BACKEND:server')

const exploreRouter = require('./routes/explore')
const { router: apiSchemaRouter } = require('./routes/apiSchema')
const callSequenceRouter = require('./routes/callSequence')
const errorHandler = require('./middleware/errorHandler')

const app = express()
const port = normalizePort(process.env.PORT || '3000')

// Middleware
app.use(logger('dev'))
app.use(express.json())
app.use(cors())
app.use(express.urlencoded({ extended: false }))

// Routes
app.use('/apischema', apiSchemaRouter)
app.use('/explore', exploreRouter)
app.use('/callsequence', callSequenceRouter)

// Error handling middleware
app.use(errorHandler.forward404)
app.use(errorHandler.handleError)

// Create HTTP server
const server = http.createServer(app)
server.listen(port, () => {
  console.log(`API explorer is listening on port ${port}`)
})
server.on('error', onError)
server.on('listening', onListening)

// Event listener for HTTP server "error" event.
function onListening () {
  const addr = server.address()
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port
  debug('Listening on ' + bind)
}

// Event listener for HTTP server "listening" event.
function onError (error) {
  if (error.syscall !== 'listen') {
    throw error
  }

  const bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges')
      process.exit(1)
      break
    case 'EADDRINUSE':
      console.error(bind + ' is already in use')
      process.exit(1)
      break
    default:
      throw error
  }
}

// Normalize a port into a number, string, or false.
function normalizePort (val) {
  const port = parseInt(val, 10)

  if (isNaN(port)) {
    // named pipe
    return val
  }

  if (port >= 0) {
    // port number
    return port
  }

  return false
}
