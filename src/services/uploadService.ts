import * as storage from '../integrations/supabaseStorage';
import { ensureUser } from './userService';

export interface UploadFileInput {
  buffer: Buffer;
  mimeType: string;
  originalName?: string;
}

export async function uploadReceipt(clerkUserId: string, input: UploadFileInput) {
  await ensureUser(clerkUserId);
  const result = await storage.uploadReceipt({
    clerkUserId,
    buffer: input.buffer,
    mimeType: input.mimeType,
    originalName: input.originalName,
  });

  return {
    receiptUri: result.url,
    path: result.path,
  };
}

export async function uploadAvatar(clerkUserId: string, input: UploadFileInput) {
  await ensureUser(clerkUserId);
  const result = await storage.uploadAvatar({
    clerkUserId,
    buffer: input.buffer,
    mimeType: input.mimeType,
    originalName: input.originalName,
  });

  return {
    avatarUrl: result.url,
    path: result.path,
  };
}
