export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new ConfigError(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function requireEnvInProduction(
  name: string,
  isProduction: boolean,
): string | undefined {
  const value = optionalEnv(name);
  if (isProduction && !value) {
    throw new ConfigError(`Missing required environment variable in production: ${name}`);
  }
  return value;
}
