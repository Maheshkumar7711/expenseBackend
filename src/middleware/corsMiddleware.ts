import cors from 'cors';
import { getConfig } from '../config';

export function createCorsMiddleware() {
  const { corsOrigins, isProduction } = getConfig();

  if (!isProduction && corsOrigins.length === 0) {
    return cors();
  }

  return cors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
  });
}
