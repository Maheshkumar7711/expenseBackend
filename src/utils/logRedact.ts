/** Paths redacted from all log output — see token-secrets-security.mdc */
export const LOG_REDACT_PATHS = [
  'req.headers.authorization',
  'headers.authorization',
  'authorization',
  'password',
  'req.body.password',
  'token',
  'refreshToken',
  'accessToken',
  'apiKey',
  'secret',
  'clerkSecretKey',
  'CLERK_SECRET_KEY',
  'MONGODB_URI',
  'cookie',
  'set-cookie',
] as const;

export const LOG_REDACT_CENSOR = '[REDACTED]';
