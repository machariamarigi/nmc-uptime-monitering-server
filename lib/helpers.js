const crypto = require('crypto')
const config = require ('../config')

const helpers = {}

/**
 * Method to hash strings with sha256
 *
 * @param {*} str - string to be hashed
 */
helpers.hash = str => {
  return typeof(str) === "string" && str.length > 0 ?
    crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex'): false
}

helpers.parseJsonToObject = str => {
  try {
    const obj = JSON.parse(str)
    return obj
  } catch(err) {
    return { Error: err }
  }
}

module.exports = helpers
