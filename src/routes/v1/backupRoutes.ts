import { Router } from 'express';
import * as backupController from '../../controllers/backupController';
import { asyncHandler } from '../../utils/asyncHandler';

export const backupRouter = Router();

backupRouter.get('/current', asyncHandler(backupController.getCurrentBackup));
backupRouter.post('/', asyncHandler(backupController.createBackup));
backupRouter.post('/restore', asyncHandler(backupController.restoreBackup));
backupRouter.delete('/current', asyncHandler(backupController.deleteBackup));
