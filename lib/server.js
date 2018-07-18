const http = require('http')
const https = require('https')
const url = require('url')
const fs = require('fs')
const path = require('path')
const StringDecoder = require('string_decoder').StringDecoder

const config = require('./config')
const handlers = require('./handlers')
const helpers = require('./helpers')

const server = {}
// define a request router
server.router = {
  ping : handlers.ping,
  users: handlers.users,
  tokens: handlers.tokens,
  checks: handlers.checks
}

server.unifiedServer = (req, res) => {
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
    const chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound

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

server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req, res)
})

server.httpsServerOptions = {
  key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '/../https/cert.pem'))
}
server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => {
  server.unifiedServer(req, res)
})

server.init = () => {
  server.httpServer.listen(config.httpPort, () => console.log(`The server is listening on port ${config.httpPort} in ${config.envName} mode`))
  server.httpsServer.listen(config.httpsPort, () => console.log(`The server is listening on port ${config.httpsPort} in ${config.envName} mode`))
}

module.exports = server
