const _data = require('./data')
const helpers = require('./helpers')

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

  handlers._tokens.verifyToken(token, phone, tokenIsValid => {
    tokenIsValid ? 
      (
        phone ? 
        firstName || lastName || password ?
          _data.read('users', phone, (err, userData) => {
            !err && userData ?
              (firstName ?
                userData.firstName = firstName :
                (lastName ?
                  userData.lastName = lastName :
                  userData.hashedPassword = helpers.hash(password)),
              _data.update('users', phone, userData, err => {
                !err ?
                  callback(200) :
                  callback(500, { Error: err })
              })) :
              callback(404, { Error: 'Specified user does not exist' })
          }) :
          callback(400, { Error: 'Missing fields to update' }) :
        callback(400, { Error: 'Missing require field' })
      ) :
      callback(403, { Error: 'Missing token in the header or the validity token has timed out' })
  })

}

/**
 * delete a user
 * TODO - clean up any other files associated with the user
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
            _data.delete('users', phone, err => {
              !err ? callback(200) : callback(500, { Error: err })
            }) :
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

handlers._tokens.verifyToken = (id, phone, callback) => {
  _data.read('tokens', id, (err, tokenData) => {
    !err && tokenData ?
      (tokenData.phone === phone && tokenData.expires > Date.now() ?
        callback(true) : callback(false)) :
      callback(false)
  })
}

handlers.notFound = (data, callback) => {
  callback(404, {error: 'Not found'})
}

module.exports = handlers;
