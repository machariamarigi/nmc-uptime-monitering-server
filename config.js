const environments = {}

environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'staging',
  hashingSecret: 'staghash',
  maxChecks: 5,
  twilio,
}

environments.production = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'production',
  hashingSecret: 'prodhash',
  maxChecks: 5,
  twilio,
}

const currentEnv = typeof(process.env.NODE_ENV) === 'string' ? process.env.NODE_ENV.toLowerCase() : ''

module.exports = typeof(environments[currentEnv]) === 'object' ? environments[currentEnv] : environments.staging
