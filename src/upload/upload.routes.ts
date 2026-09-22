import express from 'express';
import { UploadController } from './upload.controllers';
import { UploadServices } from './upload.services';
import logger from '../config/logger';
import { asyncWrapper } from '../utils/wrapper';
import authenticate from '../common/middlewares/authenticate';
import {  uploadFileSchema, uploadRouteParamsSchema } from './upload.validators';
import { validateBody, validateParams } from '../common/middlewares/validation';


const router = express.Router();
const uploadServices = new UploadServices();
const uploadController = new UploadController(uploadServices, logger);



router.post('/init', authenticate, validateBody(uploadFileSchema) , asyncWrapper(uploadController.uploadFile) )
router.post('/:uploadId/parts/presign', authenticate, validateParams(uploadRouteParamsSchema), asyncWrapper(uploadController.generatePresignedUrl) )
router.post('/:uploadId/complete', authenticate, asyncWrapper(uploadController.completeMultipartUpload) )
router.post('/:uploadId/abort', authenticate, validateParams(uploadRouteParamsSchema), asyncWrapper(uploadController.abortMultipartUpload) )
router.post('/dummy', asyncWrapper(uploadController.dummyEndpoint) )
export default router;  