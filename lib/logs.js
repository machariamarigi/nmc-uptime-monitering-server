const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const lib = {}

lib.baseDir = path.join(__dirname, '/../.logs/')

/**
 * Method to log check performance data onto a file
 *
 * @param {string} file - name of file the data will be appende to
 * @param {string} str - data to br appended to the file
 * @param {function} callback - callback function with the results of the apppending
 */
lib.append = (file, str, callback) => {
  fs.open(`${lib.baseDir}${file}.log`, 'a', (err, fileDescriptor) => {
    !err && fileDescriptor ? 
      fs.appendFile(fileDescriptor, `${str}\n`, err => {
        !err ? 
          fs.close(fileDescriptor, err => {
            !err ? callback(false) : callback('Error closing file to be appended')
        }):
          callback('Error appending the file')
      }) : 
      callback('Could not open file for appending')
  })
}

/**
 * method to list all the logs, optionally include compressed files
 *
 * @param {boolean} includeCompressedlogs - whether to include compressed files
 * @param {function} callback - callback function with our response
 */
lib.list = (includeCompressedlogs, callback) => {
  fs.readdir(lib.baseDir, (err, data) => {
    let trimmedFileNames
    !err && data && data.length > 0 ?
      (
        trimmedFileNames = [],
        data.forEach(fileName => {
          fileName.indexOf('.log') > -1 ?
            trimmedFileNames.push(fileName.replace('.log', '')) : trimmedFileNames
          fileName.indexOf('.log') > -1 && includeCompressedlogs ?
            trimmedFileNames.push(fileName.replace('.gz.b64', '')) : trimmedFileNames
        }),
        callback(false, trimmedFileNames)
      ) :
      callback(err, data)
  })
}


/**
 * Compress the contents of one .log file into a .gs.b64 file withing the same directory
 *
 * @param {string} logId - the id of a log
 * @param {string} newFieldId - new name for the destination compressed files
 * @param {function} callback - callback function with our response
 */
lib.compress = (logId, newFieldId, callback) => {
  const sourceFile = `${logId}.log`
  const destinationFile = `${newFieldId}.gz.b64`

  // read the source file
  fs.readFile(lib.baseDir+sourceFile, 'utf8', (err, inputString) => {
    !err && inputString ? 
      // compress the data using gzip
      zlib.gzip(inputString, (err, buffer) => {
        !err && buffer ?
          // send data to the destination file
          fs.open(lib.baseDir+destinationFile, 'wx', (err, fileDescriptor) => {
            !err && fileDescriptor ?
              fs.writeFile(fileDescriptor, buffer.toString('base64'), err => [
                !err ?
                  fs.close(fileDescriptor, err => {
                    !err ?
                      callback(false) : callback(err)
                  }):
                  callback(err)
              ]) :
              callback(err)
          }) :
          callback(err)
      }) :
      callback(err)
  })
}

/**
 * Decompress contents of a .gz.b64 file into a string variable
 *
 * @param {string} fileId - name of file to be unzipped
 * @param {function} callback - callback function with our response
 */
lib.decompress = (fileId, callback) => {
  const fileName = `${fileId}.gz.b64`

  fs.readFile(lib.baseDir+fileName, 'utf8', (err, str) => {
    let inputBuffer
    !err && str ?
      (
        inputBuffer = Buffer.from(str, 'base64'),
        zlib.unzip(inputBuffer, (err, outputBuffer) => {
          let str
          !err && outputBuffer ?
            (
              str = outputBuffer.toString(),
              callback(false, str)
            ):
            console.log(err)
        })
      ):
      callback(err)
  })
}

lib.truncate = (logId, callback) => {
  fs.truncate(`${lib.baseDir + logId}.log`, 0, err => {
    err ? callback(false) : callback(err)
  })
}

module.exports = lib
