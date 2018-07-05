const http = require('http')
const https = require('https')
const url = require('url')
const fs = require('fs')
const StringDecoder = require('string_decoder').StringDecoder
const config = require('./config')
const handlers = require('./lib/handlers')
const helpers = require('./lib/helpers')

// define a request router
const router = {
  ping : handlers.ping,
  users: handlers.users
}

const unifiedServer = (req, res) => {
  // get the url and parse it
  const parsedUrl = url.parse(req.url, true)

  // get trimmed path
  const path = parsedUrl.pathname
  const trimmedPath = path.replace(/^\/+|\/+$/, '')

  // get query string as an object
  const queryStringObject = parsedUrl.query

  // get HTTP method
  const method = req.method.toLowerCase()

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
      payload: helpers.parseJsonToObject(buffer)
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
}

const httpServer = http.createServer((req, res) => {
  unifiedServer(req, res)
})

const httpsServerOptions = {
  key: fs.readFileSync('./https/key.pem'),
  cert: fs.readFileSync('./https/cert.pem')
}
const httpsServer = https.createServer(httpsServerOptions, (req, res) => {
  unifiedServer(req, res)
})

// start the http server
httpServer.listen(config.httpPort, () => console.log(`The server is listening on port ${config.httpPort} in ${config.envName} mode`))

// start the https server
httpsServer.listen(config.httpsPort, () => console.log(`The server is listening on port ${config.httpsPort} in ${config.envName} mode`))
