const fs = require('fs')
const path = require('path')
const helpers = require('./helpers')

const lib = {}

lib.baseDir = path.join(__dirname, '/../.data/')

/**
 * Write data to a file
 *
 * @param {*} dir 
 * @param {string} file - name of file data is being added to
 * @param {object} data - data to being written to file
 * @param {function} callback - function with our response
 */
lib.create = (dir, file, data, callback) => {
  fs.open(`${lib.baseDir}/${file}.json`, 'wx', (err, fileDescriptor) => {
    if(!err && fileDescriptor) {
      const stringData = JSON.stringify(data)
      fs.writeFile(fileDescriptor, stringData, (err) => !err ?
        fs.close(fileDescriptor, err => !err ?
          callback(false) : callback('Error while closing file')
      ) : callback('Error while writing to new file'))
    } else {
      callback('Could not create file, it may already exist')
    }
  })
}

/**
 * Read data of a file
 *
 * @param {*} dir
 * @param {*} file - file to read data from
 * @param {*} callback - function with our response
 */
lib.read = (dir, file, callback) => {
  fs.readFile(`${lib.baseDir}/${file}.json`, 'utf8', (err, data) => {
    !err && data ? callback(false, helpers.parseJsonToObject(data)) : callback(err, data)
  })
}

/**
 * Update data on an existing file
 *
 * @param {*} dir 
 * @param {*} file - file being updated
 * @param {*} data - data being used to update file
 * @param {*} callback - function with our response
 */
lib.update = (dir, file, data, callback) => {
  fs.open(`${lib.baseDir}/${file}.json`, 'r+', (err, fileDescriptor) => {
    if(!err, fileDescriptor) {
      const stringData = JSON.stringify(data)
      fs.truncate(fileDescriptor, (err) => !err ? 
        fs.writeFile(fileDescriptor, stringData, (err) => !err ?
           fs.close(fileDescriptor, (err) => !err ?
            callback(false) : callback('Error closing the file') 
          ) : callback('Error writing to the file')
      ) : callback('Error truncating file'))
    } else {
      callback('Could not open file for editing, might not exist yet!')
    }
  })
}

/**
 * Delete a file
 *
 * @param {*} dir 
 * @param {*} file - file to be deleted
 * @param {*} callback - callback with our respone
 */
lib.delete = (dir, file, callback) => {
  fs.unlink(`${lib.baseDir}/${file}.json`, (err) => !err ?
    callback(false) : callback('Error deleting file'))
}

module.exports = lib
