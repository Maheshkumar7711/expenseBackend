import { config as loadDotenv } from 'dotenv';
import { ConfigError, optionalEnv, requireEnvInProduction } from './requireEnv';

export type NodeEnv = 'development' | 'staging' | 'production' | 'test';

export interface AppConfig {
  nodeEnv: NodeEnv;
  port: number;
  isProduction: boolean;
  isTest: boolean;
  logLevel: string;
  clerk: {
    secretKey: string | undefined;
    publishableKey: string | undefined;
    webhookSigningSecret: string | undefined;
  };
  supabase: {
    url: string | undefined;
    serviceRoleKey: string | undefined;
  };
  corsOrigins: string[];
  rateLimit: {
    windowMs: number;
    apiMaxPerIp: number;
    apiMaxPerUser: number;
    writeMaxPerUser: number;
  };
}

function parseNodeEnv(value: string | undefined): NodeEnv {
  const env = value ?? 'development';
  if (env === 'development' || env === 'staging' || env === 'production' || env === 'test') {
    return env;
  }
  throw new ConfigError(
    `Invalid NODE_ENV: "${env}". Expected development, staging, production, or test.`,
  );
}

function parsePort(value: string | undefined, fallback: number): number {
  if (!value?.trim()) {
    return fallback;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new ConfigError(`Invalid PORT: "${value}". Expected integer between 1 and 65535.`);
  }

  return port;
}

function parseCorsOrigins(value: string | undefined): string[] {
  if (!value?.trim()) {
    return [];
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function loadLocalEnv(nodeEnv: NodeEnv): void {
  if (nodeEnv === 'production') {
    return;
  }

  loadDotenv();
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value?.trim()) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function parseRateLimitConfig(): AppConfig['rateLimit'] {
  const windowMs = parsePositiveInt(optionalEnv('RATE_LIMIT_WINDOW_MS'), 60_000);

  return {
    windowMs,
    apiMaxPerIp: parsePositiveInt(optionalEnv('RATE_LIMIT_API_MAX_IP'), 120),
    apiMaxPerUser: parsePositiveInt(optionalEnv('RATE_LIMIT_API_MAX_USER'), 100),
    writeMaxPerUser: parsePositiveInt(optionalEnv('RATE_LIMIT_WRITE_MAX'), 60),
  };
}

function buildConfig(): AppConfig {
  const nodeEnv = parseNodeEnv(process.env.NODE_ENV);
  loadLocalEnv(nodeEnv);

  const isProduction = nodeEnv === 'production';
  const isTest = nodeEnv === 'test';

  const config: AppConfig = {
    nodeEnv,
    port: parsePort(process.env.PORT, 3000),
    isProduction,
    isTest,
    logLevel: optionalEnv('LOG_LEVEL') ?? (isProduction ? 'info' : 'debug'),
    clerk: {
      secretKey: requireEnvInProduction('CLERK_SECRET_KEY', isProduction),
      publishableKey: optionalEnv('CLERK_PUBLISHABLE_KEY'),
      webhookSigningSecret: optionalEnv('CLERK_WEBHOOK_SIGNING_SECRET'),
    },
    supabase: {
      url: requireEnvInProduction('SUPABASE_URL', isProduction),
      serviceRoleKey: requireEnvInProduction('SUPABASE_SERVICE_ROLE_KEY', isProduction),
    },
    corsOrigins: parseCorsOrigins(optionalEnv('CORS_ORIGINS')),
    rateLimit: parseRateLimitConfig(),
  };

  return config;
}

let cachedConfig: AppConfig | undefined;

export function getConfig(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = buildConfig();
  }
  return cachedConfig;
}

/** Load and validate config at startup. Exits process on failure in production paths. */
export function loadConfig(): AppConfig {
  try {
    const config = getConfig();
    return config;
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`[config] ${error.message}`);
      process.exit(1);
    }
    throw error;
  }
}

/** @internal Test helper — resets cached config between tests. */
export function resetConfigForTests(): void {
  cachedConfig = undefined;
}
