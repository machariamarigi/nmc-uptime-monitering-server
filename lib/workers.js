const path = require('path')
const fs = require('fs')
const https = require('https')
const http = require('http')
const url = require('url')

const _data = require('./data')
const _logs = require('./logs')
const helpers = require('./helpers')

const workers = {}

/**
 * method to perform a sanity check on the check data
 *
 * @param {object} originalCheckData
 */
workers.validateCheckData = originalCheckData => {
  originalCheckData = typeof(originalCheckData) === 'object' && originalCheckData !== !null ? originalCheckData : {}
  originalCheckData.checkId = typeof(originalCheckData.checkId) === 'string' && originalCheckData.checkId.trim().length === 20 ? originalCheckData.checkId.trim() : false
  originalCheckData.userPhone = typeof(originalCheckData.userPhone) === 'string' && originalCheckData.userPhone.trim().length === 10 ? originalCheckData.userPhone.trim() : false
  originalCheckData.protocol = typeof(originalCheckData.protocol) === 'string' && ['http', 'https'].indexOf(originalCheckData.protocol) > -1 ? originalCheckData.protocol : false
  originalCheckData.url = typeof(originalCheckData.url) === 'string' && originalCheckData.url.trim().length > 0 ? originalCheckData.url.trim() : false
  originalCheckData.method = typeof(originalCheckData.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(originalCheckData.method) > -1 ? originalCheckData.method : false
  originalCheckData.successCodes = typeof(originalCheckData.successCodes) === 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false
  originalCheckData.timeOutSeconds = typeof(originalCheckData.timeOutSeconds) === 'number' && originalCheckData.timeOutSeconds % 1 === 0 && originalCheckData.timeOutSeconds >= 1 ? originalCheckData.timeOutSeconds: false

  // set and update keys (if this is the first time the check is being run)
  originalCheckData.state = typeof(originalCheckData.state) === 'string' && ['up', 'down'].indexOf(originalCheckData.state) > -1 ? originalCheckData.state : 'down'
  originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) === 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.timeOutSeconds: false

  originalCheckData.checkId &&
  originalCheckData.userPhone &&
  originalCheckData.protocol &&
  originalCheckData.url &&
  originalCheckData.method &&
  originalCheckData.successCodes &&
  originalCheckData.timeOutSeconds ?
    workers.performCheck(originalCheckData) : console.log('Error: one of the checks was not properly formatted. Skipping it')
}

/**
 * method to perform the check and send the outcome data
 *
 * @param {object} originalCheckData
 */
workers.performCheck = originalCheckData => {
  const checkOutcome = {
    error: false,
    responseCode: false
  }

  let outcomeSent = false

  // Parse the hostname and path out of the originalCheckData
  const parsedUrl = url.parse(originalCheckData.protocol+'://'+originalCheckData.url, true);
  const hostname = parsedUrl.hostname;
  const path = parsedUrl.path; // Using path not pathname because we want the query string

  const requestDetails = {
    protocol: `${originalCheckData.protocol}:`,
    hostname,
    method: originalCheckData.method.toUpperCase(),
    path,
    timeOut: originalCheckData.timeOutSeconds * 1000
  }

  const _moduleToUse = originalCheckData.protocol === 'http' ? http : https
  const req = _moduleToUse.request(requestDetails, res => {
    const status =  res.statusCode
    checkOutcome.responseCode = status
    !outcomeSent ?
      (
        workers.processCheckOutcome(originalCheckData, checkOutcome),
        outcomeSent = true
      ) : outcomeSent
  })

  req.on('error', (err) => {
    checkOutcome.error = {
      error: true,
      value: err
    }

    !outcomeSent ?
    (
      workers.processCheckOutcome(originalCheckData, checkOutcome),
      outcomeSent = true
    ) : outcomeSent
  })

  req.on('timeout', () => {
    checkOutcome.error = {
      error: true,
      value: timeout
    }

    !outcomeSent ?
    (
      workers.processCheckOutcome(originalCheckData, checkOutcome),
      outcomeSent = true
    ) : outcomeSent
  })

  req.end()
}

/**
 * method to process the check outcome, 
 * update the check data as needed, 
 * trigger an alert to the user as needed
 * accomodate checks that have never been made
 *
 * @param {object} originalCheckData - information about a check
 * @param {object} checkOutcome - results of a perfomance check
 */
workers.processCheckOutcome = (originalCheckData, checkOutcome) => {
  // set the check as 'up' or 'down'
  const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down'

  // decide if an alert is warranted
  const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false

  // update the check data
  const newCheckData = originalCheckData
  newCheckData.state = state
  newCheckData.lastChecked = Date.now()

  // Log the outcome of the check
  const timeOfCheck = Date.now()
  workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck)

  _data.update('checks', newCheckData.checkId, newCheckData, (err) => {
    !err ?
      (alertWarranted ?
        workers.alertUsersToChange(newCheckData) : console.log('Check data has not changed, no alert needed') 
      ) :
      console.log(`Error trying to save updates: ${err}`)
  })
}

/**
 * method to alert users on changes in their check status
 *
 * @param {object} checkData - updated information check 
 */
workers.alertUsersToChange = checkData => {
  const message = `Alert: Your check for ${checkData.method.toUpperCase()} ${checkData.protocol}://${checkData.url} is currently ${checkData.state}`
  helpers.twilioSendMessage(checkData.userPhone, message, err => {
    !err ? 
      console.log(`Success: User was alerted to a status change in their check via sms(${message})`) : console.log('Error: Could not send message to a user who had a state change in their check')
  })
}

/**
 * method to log check data onto a file
 *
 * @param {object} originalCheckData - data about the check before it's processed
 * @param {object} checkOutcome - outcome produced after performing/processing a check
 * @param {string} state - the state of a users check "up" or "downn"
 * @param {boolran} alertWarranted - boolean that controls whether a user is alerted about a check
 * @param {number} timeOfCheck - time the check was performed
 */
workers.log = (originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) => {
  const logData = {
    check: originalCheckData,
    outcome: checkOutcome,
    state,
    alert: alertWarranted,
    time: timeOfCheck
  }

  const logString = JSON.stringify(logData)

  const logFileName = originalCheckData.checkId

  // Append the log string to the file
  _logs.append(logFileName, logString, err => {
    !err ? console.log("Logging to file succeeded") : console.log("Logging to file failed ", err)
  })
}

/**
 * method used to used to execute the worker process every minute
 */
workers.loop = () => {
  setInterval(() => {
    workers.gatherAllChecks()
  }, 1000 * 60)
}

/**
 * method to look up all the checks, get their data and send
 */
workers.gatherAllChecks = () => {
  _data.list('checks', (err, checks) => {
    !err && checks && checks.length > 0 ?
      checks.forEach(check => {
        _data.read('checks', check, (err, originalCheckData) => {
          !err && originalCheckData ?
            workers.validateCheckData(originalCheckData) :
            console.log('Error while reading one of the check\'s data')
        })
      }) :
      console.log('Error: Could not find any checks to process')
  })
}

/**
 * method to rotate(compress) the log files
 */
workers.rotateLogs = () => {
  // list all the (non compressed) log files
  _logs.list(false, (err, logs) => {
    !err && logs && logs.length > 0 ?
      (
        logs.forEach(logName => {
          const logId = logName.replace('.log', '')
          const newFileId = `${logId}-${Date.now()}`
          _logs.compress(logId, newFileId, err => {
            !err ? 
              _logs.truncate(logId, err => {
                !err ? console.log('Success truncating the log file') : console.log('Error truncating the log file')
              }) :
              console.log('Error compressing one of the log files', err)
          })
        })
      ) :
      console.log('Error: Could not find any files to rotate')
  })
}

/**
 * method to execute the log rotation once every day
 */
workers.logRotationLoop = () => {
  setInterval(() => {
    workers.rotateLogs()
  }, 1000 * 60 * 60 * 24)
}

workers.init = () => {
  workers.gatherAllChecks()
  workers.loop()
  workers.rotateLogs()
  workers.logRotationLoop()
}

module.exports = workers
