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
    return JSON.parse(str)
  } catch(err) {
    return { Error: err }
  }
}

helpers.createRandomString = stringLength => {
  stringLength = typeof(stringLength) === 'number' && stringLength > 0 ? stringLength : false

  if (stringLength) {
    let randomString = ''
    const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz1234567890'

    for (let i = 0; i < stringLength; i++)
      randomString += possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length))
    
    return randomString
  } else {
    return false;
  }
}

module.exports = helpers
