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
 * TODO - authenticate users before returning data 
 *
 * @param {*} data - request data
 * @param {*} callback - callback function for our response
 */
handlers._users.get = (data, callback) => {
  const phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone : false

  phone ?
    _data.read('user', phone, (err, data) => {
      !err && data ? 
        (delete data.hashedPassword, callback(err, data)) :
        callback(404, { Error: 'Specified user does not exist' })
    }) :
    callback(400, { Error: 'Missing required field' })
}

/**
 * update a user
 * TODO - authenticate users and allow them to only be able update their data
 * 
 * @param {*} data - request data
 * @param {*} callback - callback function for our response
 */
handlers._users.put = (data, callback) => {
  const phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone : false

  const firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName : false
  const lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName : false
  const password = typeof(data.payload.password) === 'string' && data.payload.password.trim() > 0 ? data.payload.password : false

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
}

/**
 * delete a user
 * TODO - authenticate users and allow them to only delete themselves
 * TODO - clean up any other files associated with the user
 *
 * @param {*} data - request data
 * @param {*} callback - callback function with our respons
 */
handlers._users.delete = (data, callback) => {
  const phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone : false

  phone ?
    _data.read('users', phone, (err, data) => {
      !err && data ?
        _data.delete('users', phone, err => {
          !err ? callback(200) : callback(500, { Error: err })
        }) :
        callback(404, { Error: 'Specified user does not exist' })
    }) :
    callback(400, { Error: 'Missing required field' })
}

handlers.notFound = (data, callback) => {
  callback(404, {error: 'Not found'})
}

module.exports = handlers;
