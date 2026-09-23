import express from 'express';
import logger from '../config/logger';
import { FileService } from './file.services';
import { FileController } from './file.controller';
import authenticate from '../common/middlewares/authenticate';
import { asyncWrapper } from '../utils/wrapper';

const router = express.Router();
const fileService = new FileService();
const fileController = new FileController(fileService, logger);

router.patch("/rename/:id", authenticate, asyncWrapper(fileController.renameFile) )
router.delete("/delete/:id", authenticate, asyncWrapper(fileController.deleteFile) )
router.post("/restore/:id", authenticate, asyncWrapper(fileController.restoreFile) )
router.get("/trash", authenticate, asyncWrapper(fileController.getTrashFiles) )
router.patch("/move/:id", authenticate, asyncWrapper(fileController.moveFile) )
router.delete("/permanent-delete/:id", authenticate, asyncWrapper(fileController.deleteFile) )

export default router;