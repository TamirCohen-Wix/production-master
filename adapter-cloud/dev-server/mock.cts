/**
 * Mock SDM config values for local Wix Serverless CLI development.
 *
 * These values are injected into FunctionContext.getConfig() when
 * running locally via `wix-serverless-cli start`.
 */

module.exports = {
  appSecret: 'dev-app-secret',
  postgresHost: 'localhost',
  postgresPassword: 'dev-password',
  redisHost: 'localhost',
  redisPassword: '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? 'sk-ant-dev-key',
  jwtSecret: 'dev-jwt-secret',
  mcpServiceAccountToken: 'dev-mcp-token',
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'dev-key',
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'dev-secret',
  s3Bucket: 'production-master-reports-dev',
};
