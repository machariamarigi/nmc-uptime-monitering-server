const crypto = require('crypto')
const queryString = require('querystring')
const https = require('https')

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

/**
 * helper method to access the twilio api and allow users to send a message
 *
 * @param {string} phone - phone number of the message receipiant
 * @param {string} message - message to be sent
 * @param {function} callback - callback function with our response
 */
helpers.twilioSendMessage = (phone, message, callback) => {
  phone = typeof(phone) === 'string' && phone.trim().length === 10 ? phone : false
  message = typeof(message) === 'string' && message.trim().length > 0 && message.trim().length <= 1600 ? message.trim() : false

  let payload, stringPayload, requestDetails, req
  phone && message ?
    (
      payload = {
        From: config.twilio.fromNumber,
        To: `+254${phone}`,
        Body: message
      },
      stringPayload = queryString.stringify(payload),
      requestDetails = {
        protocol: 'https:',
        hostname: 'api.twilio.com',
        method: 'POST',
        path: `/2010-04-01/accounts/${config.twilio.accountSid}/Messages.json`,
        auth: `${config.twilio.accountSid}:${config.twilio.authToken}`,
        headers : {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(stringPayload)
        }
      },
      req = https.request(requestDetails, res => {
        const status = res.statusCode

        status === 200 || status || 201 ? callback(false) : callback(`Status code returned was ${status}`)
      }),
      req.on('error', err => {
        callback(err)
      }),
      req.write(stringPayload),
      req.end()
    ):
    callback('Required parameters were missing or invalid')
}

module.exports = helpers
