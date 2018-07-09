const environments = {}

twilio = {
  accountSid: 'ACb32d411ad7fe886aac54c665d25e5c5d',
  authToken: '9455e3eb3109edc12e3d8c92768f7a67',
  fromPhone: '+15005550006'
}

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
