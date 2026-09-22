import express from 'express';
import logger from '../config/logger';
import { FileService } from './file.services';
import { FileController } from './file.controller';
import authenticate from '../common/middlewares/authenticate';
import { asyncWrapper } from '../utils/wrapper';

const router = express.Router();
const fileService = new FileService();
const fileController = new FileController(fileService, logger);

router.patch("/rename/:id", authenticate, asyncWrapper(fileController) )




export default router;