import { createClerkClient, verifyToken } from '@clerk/backend';
import { getConfig } from '../config';
import { InternalServerError, UnauthorizedError } from '../errors';

export interface VerifiedAuth {
  userId: string;
  sessionId?: string;
}

let clerkClient: ReturnType<typeof createClerkClient> | undefined;

function getClerkClient(): ReturnType<typeof createClerkClient> {
  const { clerk } = getConfig();
  if (!clerk.secretKey) {
    throw new InternalServerError('Clerk is not configured');
  }

  if (!clerkClient) {
    clerkClient = createClerkClient({ secretKey: clerk.secretKey });
  }

  return clerkClient;
}

function isTokenExpiredError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return message.includes('expired') || message.includes('jwt expired');
}

export async function verifyClerkToken(token: string): Promise<VerifiedAuth> {
  const { clerk } = getConfig();
  if (!clerk.secretKey) {
    throw new UnauthorizedError('Authentication is not configured');
  }

  try {
    const payload = await verifyToken(token, {
      secretKey: clerk.secretKey,
    });

    if (!payload.sub) {
      throw new UnauthorizedError('Invalid authentication token');
    }

    return {
      userId: payload.sub,
      sessionId: typeof payload.sid === 'string' ? payload.sid : undefined,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    if (isTokenExpiredError(error)) {
      throw new UnauthorizedError('Session expired', 'TOKEN_EXPIRED');
    }
    throw new UnauthorizedError('Invalid or expired authentication token');
  }
}

export { getClerkClient };
