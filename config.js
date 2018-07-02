const environments = {}

environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'staging'
}

environments.production = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'production'
}

const currentEnv = typeof(process.env.NODE_ENV) === 'string' ? process.env.NODE_ENV.toLowerCase() : ''

module.exports = typeof(environments[currentEnv]) === 'object' ? environments[currentEnv] : environments.staging
