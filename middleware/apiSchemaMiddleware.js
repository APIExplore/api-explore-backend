const multer = require('multer')
const path = require('path')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../', 'apiSchemas'))
  },
  filename: (req, file, cb) => {
    cb(null, 'apiSchema.json')
  }
})

const uploadSchema = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/json') {
      const error = new Error('File must be in JSON format')
      error.status = 400
      cb(error, false)
    } else {
      cb(null, true)
    }
  }
})

module.exports = uploadSchema
