const http = require('http')
const url = require('url')
const StringDecoder = require('string_decoder').StringDecoder

// server responding to requests
const server = http.createServer((req, res) => {

  // Get the url and parse it
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
    
    // send response
    res.end('Hello World\n')
    console.log('Headers: ', headers)
    console.log(`${method} request received on path ${trimmedPath} with the following query strings `, queryStringObject)
    console.log('Payload: ', buffer)
  })

})

// start the server and have it listening on prt 3000
server.listen(3000, () => console.log('The server is listening on port 3000'))
