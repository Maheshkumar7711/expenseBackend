function isTransientDbError(error: unknown): boolean {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error);

  const normalized = message.toLowerCase();
  return (
    normalized.includes('fetch failed') ||
    normalized.includes('econnreset') ||
    normalized.includes('etimedout') ||
    normalized.includes('enotfound') ||
    normalized.includes('socket hang up') ||
    normalized.includes('network') ||
    normalized.includes('timeout')
  );
}

export async function withDbRetry<T>(
  operation: () => Promise<T>,
  options?: { maxAttempts?: number; baseDelayMs?: number },
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const baseDelayMs = options?.baseDelayMs ?? 400;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error) || attempt === maxAttempts) {
        throw error;
      }
      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}
