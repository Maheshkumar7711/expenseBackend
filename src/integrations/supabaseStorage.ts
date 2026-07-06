import { getSupabaseAdmin } from './supabaseClient';
import { BadRequestError, InternalServerError } from '../errors';
import { generateId } from '../utils/generateId';

const RECEIPTS_BUCKET = 'receipts';
const AVATARS_BUCKET = 'avatars';

const RECEIPT_SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
]);

function extensionForMime(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
      return 'heic';
    default:
      return 'bin';
  }
}

function wrapStorageError(error: { message: string }): never {
  throw new InternalServerError(`Storage error: ${error.message}`);
}

export interface UploadedFileInput {
  clerkUserId: string;
  buffer: Buffer;
  mimeType: string;
  originalName?: string;
}

export interface UploadResult {
  path: string;
  url: string;
}

export async function uploadReceipt(input: UploadedFileInput): Promise<UploadResult> {
  return uploadToBucket({
    ...input,
    bucket: RECEIPTS_BUCKET,
    idPrefix: 'rcpt',
    signedUrlTtlSeconds: RECEIPT_SIGNED_URL_TTL_SECONDS,
  });
}

export async function uploadAvatar(input: UploadedFileInput): Promise<UploadResult> {
  return uploadToBucket({
    ...input,
    bucket: AVATARS_BUCKET,
    idPrefix: 'avatar',
    usePublicUrl: true,
  });
}

async function uploadToBucket(
  input: UploadedFileInput & {
    bucket: string;
    idPrefix: string;
    signedUrlTtlSeconds?: number;
    usePublicUrl?: boolean;
  },
): Promise<UploadResult> {
  if (!ALLOWED_IMAGE_TYPES.has(input.mimeType)) {
    throw new BadRequestError('Unsupported file type. Use JPEG, PNG, or WebP.', 'INVALID_FILE_TYPE');
  }

  const ext = extensionForMime(input.mimeType);
  const path = `${input.clerkUserId}/${generateId(input.idPrefix)}.${ext}`;

  const { error: uploadError } = await getSupabaseAdmin()
    .storage.from(input.bucket)
    .upload(path, input.buffer, {
      contentType: input.mimeType,
      upsert: false,
    });

  if (uploadError) {
    wrapStorageError(uploadError);
  }

  if (input.usePublicUrl) {
    const { data } = getSupabaseAdmin().storage.from(input.bucket).getPublicUrl(path);
    return { path, url: data.publicUrl };
  }

  const { data, error: signError } = await getSupabaseAdmin()
    .storage.from(input.bucket)
    .createSignedUrl(path, input.signedUrlTtlSeconds ?? RECEIPT_SIGNED_URL_TTL_SECONDS);

  if (signError || !data?.signedUrl) {
    wrapStorageError(signError ?? { message: 'Failed to create signed URL' });
  }

  return { path, url: data.signedUrl };
}

/** Best-effort removal of uploaded receipts and avatars for a Clerk user. */
export async function deleteUserUploads(clerkUserId: string): Promise<void> {
  await Promise.all(
    [RECEIPTS_BUCKET, AVATARS_BUCKET].map(async (bucket) => {
      try {
        await deleteBucketUserFolder(bucket, clerkUserId);
      } catch (error) {
        console.warn(`[storage] wipe uploads failed for bucket=${bucket}`, error);
      }
    }),
  );
}

async function deleteBucketUserFolder(bucket: string, clerkUserId: string): Promise<void> {
  const storage = getSupabaseAdmin().storage.from(bucket);
  const pageSize = 1000;
  let offset = 0;

  for (;;) {
    const { data: files, error: listError } = await storage.list(clerkUserId, {
      limit: pageSize,
      offset,
    });

    if (listError) {
      wrapStorageError(listError);
    }

    if (!files?.length) {
      return;
    }

    const paths = files.map((file) => `${clerkUserId}/${file.name}`);
    const { error: removeError } = await storage.remove(paths);

    if (removeError) {
      wrapStorageError(removeError);
    }

    if (files.length < pageSize) {
      return;
    }
    offset += pageSize;
  }
}
