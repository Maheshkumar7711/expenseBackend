import { Router } from 'express';
import * as uploadController from '../../controllers/uploadController';
import { wrapMulterUpload } from '../../middleware/multerErrorMiddleware';
import { avatarUpload, receiptUpload } from '../../middleware/uploadMiddleware';
import { asyncHandler } from '../../utils/asyncHandler';

export const uploadRouter = Router();

uploadRouter.post(
  '/receipts',
  wrapMulterUpload(receiptUpload),
  asyncHandler(uploadController.uploadReceipt),
);

uploadRouter.post(
  '/avatars',
  wrapMulterUpload(avatarUpload),
  asyncHandler(uploadController.uploadAvatar),
);
