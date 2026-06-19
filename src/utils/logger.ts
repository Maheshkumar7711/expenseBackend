import pino from 'pino';
import { getConfig } from '../config';
import { LOG_REDACT_CENSOR, LOG_REDACT_PATHS } from './logRedact';

export function createLogger() {
  const { logLevel, isProduction, nodeEnv } = getConfig();

  return pino({
    level: logLevel,
    base: { service: 'expense-backend', env: nodeEnv },
    redact: {
      paths: [...LOG_REDACT_PATHS],
      censor: LOG_REDACT_CENSOR,
    },
    transport: isProduction
      ? undefined
      : {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
          },
        },
  });
}

let loggerInstance: pino.Logger | undefined;

export function getLogger(): pino.Logger {
  if (!loggerInstance) {
    loggerInstance = createLogger();
  }
  return loggerInstance;
}

/** @internal Test helper */
export function resetLoggerForTests(): void {
  loggerInstance = undefined;
}

export type Logger = pino.Logger;
