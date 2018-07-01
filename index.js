const http = require('http')
const url = require('url')
const StringDecoder = require('string_decoder').StringDecoder

// server responding to requests
const server = http.createServer((req, res) => {

  // get the url and parse it
  const parsedUrl = url.parse(req.url, true)

  // get trimmed path
  const path = parsedUrl.pathname
  const trimmedPath = path.replace(/^\/+|\/+$/, '')

  // get query string as an object
  const queryStringObject = parsedUrl.query

  // get HTTP method
  const method = req.method.toUpperCase()

  // get the headers as an object
  const headers = req.headers

  // get the payload if there's any
  const decoder = new StringDecoder('utf-8')
  let buffer = '';
  req.on('data', (data) => buffer += decoder.write(data))

  req.on('end', () => {
    buffer += decoder.end()

    // choose hanlder this request should go to
    const chosenHandler = typeof(router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound

    // constract data object to send to handler
    const data = {
      trimmedPath,
      queryStringObject,
      method,
      headers,
      'payload': buffer
    }

    chosenHandler(data, (statusCode, payload) => {
      statusCode = typeof(statusCode) === 'number' ? statusCode : 200

      // payload object from handler or empty object converted into a string
      payload = typeof(payload) == 'object' ? payload : {}
      payloadString = JSON.stringify(payload)

      // returning the response
      res.setHeader('Content-Type', 'application/json')
      res.writeHead(statusCode)
      res.end(payloadString)
      console.log(`Return with response ${statusCode} ${payloadString}`)
    })
  })

})

// start the server and have it listening on prt 3000
server.listen(3000, () => console.log('The server is listening on port 3000'))

// define handlers
const handlers = {}

handlers.sample = (data, callback) => {
  callback(406, {name: 'sample handler'})
}

handlers.notFound = (data, callback) => {
  callback(404, {error: 'Not found'})
}

// define a request router
const router = {
  'sample': handlers.sample
}
