import { createApp } from './app';
import { loadConfig } from './config';
import { getLogger } from './utils/logger';

const config = loadConfig();
const logger = getLogger();
const app = createApp();

const server = app.listen(config.port, () => {
  logger.info({ port: config.port, nodeEnv: config.nodeEnv }, 'Expense Backend started');
});

server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(
      { port: config.port },
      `Port ${config.port} is already in use. Stop the other process or set PORT in .env.`,
    );
    process.exit(1);
  }

  logger.error({ err: error }, 'HTTP server failed to start');
  process.exit(1);
});

function shutdown(signal: string): void {
  logger.info({ signal }, 'Shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
