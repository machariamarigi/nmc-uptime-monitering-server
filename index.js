const http = require('http')

const server = http.createServer((req, res) => {
  res.end('Hello World\n')
})

// start the server and have it listening on prt 3000
server.listen(3000, () => console.log('The server is listening on port 3000'))
