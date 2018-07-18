const _data = require('./data')
const helpers = require('./helpers')
const config = require('./config')

const handlers = {}

handlers.ping = (data, callback) => {
  callback(200)
}

/**
 * handler for user route
 *
 * @param {*} data - request data
 * @param {*} callback - function carrying our response
 */
handlers.users = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete']
  acceptableMethods.indexOf(data.method) > -1 ? handlers._users[data.method](data, callback) : callback(405)
}

handlers._users = {}

/**
 * Method to create and store users
 * 
 * @param {*} data - request data
 * @param {*} callback - function carrying our response
 */
handlers._users.post = (data, callback) => {
  const firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName : false
  const lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName : false
  const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone : false
  const password = typeof(data.payload.password) === 'string' && data.payload.password.trim() > 0 ? data.payload.password : false
  const tosAgreement = typeof(data.payload.tosAgreement) === 'boolean' && data.payload.tosAgreement ? true : false

  if(firstName && lastName && phone && password && tosAgreement) {
    _data.read('users', phone, (err, data) => {
      if (err) {
        const hashedPassword = helpers.hash(password)
        if (hashedPassword) {
          const userObject = {
            firstName,
            lastName,
            phone,
            hashedPassword,
            tosAgreement
          }
          _data.create('users', phone, userObject, err => {
            !err ? callback(200) : callback(500, { Error: 'Could not create new user' })
          })
        } else {
          callback(500, { Error: 'Could not create hash password' })
        }
      } else {
        callback(400, { Error: 'A user with that phone number exixts' })
      }
    })
  } else {
    callback(400, { Error: 'Missing required parameters' })
  }
}

/**
 * get user
 *
 * @param {*} data - request data
 * @param {*} callback - callback function for our response
 */
handlers._users.get = (data, callback) => {
  const phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone : false

  const token = typeof(data.headers.token) === 'string' ? data.headers.token : false

  handlers._tokens.verifyToken(token, phone, tokenIsValid => {
    tokenIsValid ?
    (
      phone ?
      _data.read('users', phone, (err, data) => {
        !err && data ? 
          (delete data.hashedPassword, callback(err, data)) :
          callback(404, { Error: 'Specified user does not exist' })
      }) :
      callback(400, { Error: 'Missing required field' })
    ) :
    callback(403, { Error: 'Missing token in the header or the validity token has timed out' })
  })


}

/**
 * update a user
 * 
 * @param {*} data - request data
 * @param {*} callback - callback function for our response
 */
handlers._users.put = (data, callback) => {
  const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone : false

  const firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName : false
  const lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName : false
  const password = typeof(data.payload.password) === 'string' && data.payload.password.trim() > 0 ? data.payload.password : false

  const token = typeof(data.headers.token) === 'string' ? data.headers.token : false

  phone ?
    handlers._tokens.verifyToken(token, phone, tokenIsValid => {
      tokenIsValid ? 
        (
          firstName || lastName || password ?
            _data.read('users', phone, (err, userData) => {
              !err && userData ?
                (
                  firstName ? userData.firstName = firstName : userData,
                  lastName ? userData.lastName = lastName : userData,
                  password ? userData.hashedPassword = helpers.hash(password): userData,
                  _data.update('users', phone, userData, err => {
                    !err ?
                      callback(200) :
                      callback(500, { Error: err })
                })) :
                callback(404, { Error: 'Specified user does not exist' })
            }) :
            callback(400, { Error: 'Missing fields to update' })
        ) :
        callback(403, { Error: 'Missing token in the header or the validity token has timed out' })
    }) :
    callback(400, { Error: 'Missing required field' })
}

/**
 * delete a user
 *
 * @param {*} data - request data
 * @param {*} callback - callback function with our respons
 */
handlers._users.delete = (data, callback) => {
  const phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone : false

  const token = typeof(data.headers.token) === 'string' ? data.headers.token : false

  handlers._tokens.verifyToken(token, phone, tokenIsValid => {
    tokenIsValid ?
      (
        phone ?
        _data.read('users', phone, (err, data) => {
          !err && data ?
            (
              _data.delete('users', phone, err => {
                let userChecks, checksToDelete, checksDeleted, deletionErrors
                !err ? 
                (
                  userChecks = typeof(data.checks) === 'object' && data.checks instanceof Array ? data.checks : [],
                  checksToDelete = userChecks.length,
                  checksToDelete > 0 ?
                    (
                      checksDeleted = 0,
                      deletionErrors = false,
                      userChecks.forEach(checkId => {
                        _data.delete('checks', checkId, err => {
                          checksDeleted ++,
                          err ? deletionErrors = true : deletionErrors
                          checksDeleted === checksToDelete ?
                            (
                              !deletionErrors ? callback(200) : callback(500, { Error: 'Errors encountered while attempting to delete all the user\'s checks' })
                            ) :
                            checksDeleted
                        })
                      })
                    ) :
                    callback(200)
                ) : 
                callback(500, { Error: err })
              })
            ) :
            callback(404, { Error: 'Specified user does not exist' })
        }) :
        callback(400, { Error: 'Missing required field' })
      ) :
      callback(403, { Error: 'Missing token in the header or the validity token has timed out' })
  })
}

/**
 * handler for tokens route
 *
 * @param {*} data - request data
 * @param {*} callback - callback function carrying our response
 */
handlers.tokens = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete']
  acceptableMethods.indexOf(data.method) > -1 ? handlers._tokens[data.method](data, callback) : callback(405)
}

handlers._tokens = {}

/**
 * post tokens
 *
 * @param {*} data - request data 
 * @param {*} callback - callback function tha carries our response
 */
handlers._tokens.post = (data, callback) => {
  const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone : false
  const password = typeof(data.payload.password) === 'string' && data.payload.password.trim() > 0 ? data.payload.password : false

  phone && password ?
    (_data.read('users', phone, (err, userData) => {
      let tokenId, expires, tokenObject
      !err && userData ?
        helpers.hash(password) === userData.hashedPassword ? 
          (
            tokenId = helpers.createRandomString(20),
            expires = Date.now() + 24 * (1000 * 60 * 60),
            tokenObject = {
              phone,
              id: tokenId,
              expires
            },
            _data.create('tokens', tokenId, tokenObject, err => {
              !err ? callback(200, tokenObject) : callback(500, { Error: 'Could not create the new token' })
            })
          ) :
          callback(400, { Error: 'Password did not match the specified user\'s stored password' }) :
        callback(404, { Error: 'Specified user does not exist' })
    })):
    callback(400, { Error: 'Missing required field' })
}

/**
 * get a user's token
 *
 * @param {*} data - request data
 * @param {*} callback - callback function with our response
 */
handlers._tokens.get = (data, callback) => {
  const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id : false

  id ?
    _data.read('tokens', id, (err, tokenData) => {
      !err && data ? 
        callback(200, tokenData) :
        callback(404, { Error: 'Specified user does not exist' })
    }) :
    callback(400, { Error: 'Missing required field' })
}

/**
 * extend a user's token by a day
 *
 * @param {*} data - request data
 * @param {*} callback - callback function with our response
 */
handlers._tokens.put = (data, callback) => {
  const id = typeof(data.payload.id) === 'string' && data.payload.id.trim().length === 20 ? data.payload.id : false
  const extend = typeof(data.payload.extend) === 'boolean' ? data.payload.extend : false

  id && extend ?  
    _data.read('tokens', id, (err, tokenData) => {
      !err && tokenData ?
        tokenData.expires > Date.now() ?
          (
            tokenData.expires = Date.now() + 24 * (1000 * 60 * 60),
            _data.update('tokens', id, tokenData, err => {
              !err ? callback(200) : callback(500, { Error: 'Could not update the token\'s expiration' })
            })
          ) :
          callback(400, {Error: 'The token has already expired and cannot be extended'}) :
        callback(400, { Error: 'Specified token doesn\'t exists' })
    }) :
    callback(400, { Error: 'Missing required field(s) or invalid field(s)' })
}


/**
 * delete a user's token
 *
 * @param {*} data - request data
 * @param {*} callback - callback function with our response
 */
handlers._tokens.delete = (data, callback) => {
  const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id : false

  id ?
    _data.read('tokens', id, (err, data) => {
      !err && data ?
        _data.delete('tokens', id, err => {
          !err ? callback(200) : callback(500, { Error: err })
        }) :
        callback(404, { Error: 'Specified token does not exist' })
    }) :
    callback(400, { Error: 'Missing required field' })
}

/**
 * method used to verify user tokens and authenticate users
 * 
 * @param {*} id - the token id
 * @param {*} phone - user's phone number
 * @param {*} callback - callback 
 */
handlers._tokens.verifyToken = (id, phone, callback) => {
  _data.read('tokens', id, (err, tokenData) => {
    !err && tokenData ?
      (tokenData.phone === phone && tokenData.expires > Date.now() ?
        callback(true) : callback(false)) :
      callback(false)
  })
}

/**
 * handler for checks route
 *
 * @param {*} data - request data
 * @param {*} callback - callback function carrying our response
 */
handlers.checks = (data, callback) => {
  const acceptableMethods = ['post', 'get', 'put', 'delete']
  acceptableMethods.indexOf(data.method) > -1 ? handlers._checks[data.method](data, callback) : callback(405)
}

handlers._checks = {}

/**
 * create a check with user validation and update users with their checks
 * 
 * @param {*} data - request data
 * @param {*} callback - callback function with our response
 */
handlers._checks.post = (data, callback) => {
  const protocol = typeof(data.payload.protocol) === 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false
  const url = typeof(data.payload.url) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url : false
  const method = typeof(data.payload.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false
  const successCodes = typeof(data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false
  const timeOutSeconds = typeof(data.payload.timeOutSeconds) === 'number' && data.payload.timeOutSeconds % 1 === 0 && data.payload.timeOutSeconds >= 1  ? data.payload.timeOutSeconds : false

  const token = typeof(data.headers.token) === 'string' ? data.headers.token : false
  protocol && url && method && successCodes && timeOutSeconds ?
    (
      _data.read('tokens', token,  (err, tokenData) => {
        let userPhone, userChecks, checkId, checkObject

        !err, tokenData ?
          (
            userPhone = tokenData.phone,
            _data.read('users', userPhone, (err, userData) => 
            {
              !err && userData ?
                (
                  userChecks = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [],

                  userChecks.length < config.maxChecks ?
                    (
                      checkId = helpers.createRandomString(20),
                      checkObject = {
                        checkId,
                        userPhone,
                        protocol,
                        url,
                        method,
                        successCodes,
                        timeOutSeconds
                      },
                      _data.create('checks', checkId, checkObject, err => {
                        !err ? 
                          (
                            userData.checks = userChecks,
                            userData.checks.push(checkId),
                            _data.update('users', userPhone, userData, err => {
                              !err ? callback(200, checkObject) : callback(500, { Error: 'Could not update the user with the new check' })
                            })
                          ) : callback(500, { Error: 'Could not create the new check' })
                      })
                    ) :
                    callback(400, { Error: `User already has maximum number of checks (${config.maxChecks})` })
                ) :
                callback(403)
            })
          ) :
          callback(403)
      })
    ) :
    callback(400, { Error: 'Missing required field' })
}

/**
 * get a check for a given user
 *
 * @param {*} data - request data
 * @param {*} callback - callback function with our response
 */
handlers._checks.get = (data, callback) => {
  const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id : false

  const token = typeof(data.headers.token) === 'string' ? data.headers.token : false

  id ? (
    _data.read('checks', id, (err, checkData) => {
      !err && checkData ?
        handlers._tokens.verifyToken(token, checkData.userPhone, tokenIsValid => {
          tokenIsValid ?
            callback(200, checkData) :  callback(403, { Error: 'Missing token in the header or the validity token has timed out' })
        }) :
        callback(404)     
    })
  ) : callback(400, { Error: 'Missing required field' })
}

/**
 * update a user check
 *
 * @param {*} data - request data
 * @param {*} callback - callback function with our response
 */
handlers._checks.put = (data,callback) => {
  const id = typeof(data.payload.id) === 'string' && data.payload.id.trim().length === 20 ? data.payload.id : false

  const protocol = typeof(data.payload.protocol) === 'string' && ['https', 'http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false
  const url = typeof(data.payload.url) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url : false
  const method = typeof(data.payload.method) === 'string' && ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false
  const successCodes = typeof(data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array && data.payload.successCodes.length > 0 ? data.payload.successCodes : false
  const timeOutSeconds = typeof(data.payload.timeOutSeconds) === 'number' && data.payload.timeOutSeconds % 1 === 0 && data.payload.timeOutSeconds >= 1  ? data.payload.timeOutSeconds : false

  const token = typeof(data.headers.token) === 'string' ? data.headers.token : false

  id ?
    (
      protocol || url || method || successCodes || timeOutSeconds ?     
        _data.read('checks', id, (err, checkData) => {
          !err && checkData ?
            handlers._tokens.verifyToken(token, checkData.userPhone, tokenIsValid => {
              tokenIsValid ? 
                (
                  protocol ? checkData.protocol = protocol : checkData,
                  url ? checkData.url = url : checkData,
                  method ? checkData.method = method : checkData,
                  successCodes ? checkData.successCodes = successCodes : checkData,
                  timeOutSeconds ? checkData.timeOutSeconds = timeOutSeconds : checkData,
                  _data.update('checks', id, checkData, err => {
                    !err ? callback(200) :callback(500, { Error: 'Could not update the check' })
                  })     
                ) :
                callback(403, { Error: 'Missing token in the header or the validity token has timed out' })
            }) :
            callback(400, { Error: 'Check ID does not exist' })
        }) :
        callback(400, { Error: 'Missing optional field(s) to update' })
    ) :
    callback(400, { Error: 'Missing required field' })
}

handlers._checks.delete = (data, callback) => {
  const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id : false

  const token = typeof(data.headers.token) === 'string' ? data.headers.token : false

  id ?
    _data.read('checks', id, (err, checkData) => {
      !err && checkData ?
        (
          handlers._tokens.verifyToken(token, checkData.userPhone, tokenIsValid => {
            tokenIsValid ?
              (
                _data.delete('checks', id, err => {
                  !err ? 
                  (
                    _data.read('users', checkData.userPhone, (err, userData) => {
                      let userChecks, checkPosition
                      !err && userData ?
                        (
                          userChecks = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [],
                          checkPosition = userChecks.indexOf(id),
                          checkPosition > -1 ?
                            (
                              userChecks.splice(checkPosition, 1),
                              _data.update('users', checkData.userPhone, userData, err => {
                                !err ? callback(200) : callback(500, { Error: 'Could not update the user' })
                              })
                            ) :
                            callback(500, { Error: 'Could not find the check in the list of user checks' }) 
                        ) :
                        callback(400, { Error: 'Could not find specified user'})  
                    })
                  ) : 
                  callback(500, { Error: err })
                })
              ) :
              callback(403, { Error: 'Missing token in the header or the validity token has timed out' })
          })
        ):
        callback(400, { Error: 'Check ID does not exist' })
    }) :
    callback(400, { Error: 'Missing required field' })
}

handlers.notFound = (data, callback) => {
  callback(404, {error: 'Not found'})
}

module.exports = handlers;
