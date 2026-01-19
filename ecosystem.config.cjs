module.exports = {
  apps: [
    {
      name: 'koroluk-app',
      port: '3000',
      exec_mode: 'cluster',
      instances: 'max',
      script: './.output/server/index.mjs',
      env: {
        NODE_ENV: 'production',
        // Environment variables will be injected by the server environment or .env file
      }
    }
  ]
}
