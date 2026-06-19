import multer from 'multer';

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const memoryStorage = multer.memoryStorage();

function createImageUpload(maxBytes: number) {
  return multer({
    storage: memoryStorage,
    limits: { fileSize: maxBytes, files: 1 },
    fileFilter: (_req, file, callback) => {
      if (!file.mimetype.startsWith('image/')) {
        callback(new Error('INVALID_FILE_TYPE'));
        return;
      }
      callback(null, true);
    },
  });
}

export const receiptUpload = createImageUpload(MAX_RECEIPT_BYTES).single('file');
export const avatarUpload = createImageUpload(MAX_AVATAR_BYTES).single('file');
