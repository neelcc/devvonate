import express from 'express';
import { FolderController } from './folder.controller';
import { FolderServices } from './folder.services';
import logger from '../config/logger';
import { asyncWrapper } from '../utils/wrapper';
import authenticate from '../common/middlewares/authenticate';
import { validateBody, validateParams, validateQuery } from '../common/middlewares/validation';
import { createFolderSchema, listRootFoldersSchema, getChildFoldersSchema, renameFolderSchema, renameFolderParamsSchema, moveFolderParamsSchema, moveFolderSchema, deleteFolderParamsSchema, deleteFileParamsSchema } from './folders.validator';

const router = express.Router();
const folderServices = new FolderServices();
const folderController = new FolderController(folderServices, logger);

router.post('/', authenticate , validateBody(createFolderSchema) , asyncWrapper(folderController.createFolder));
router.get('/:id/folders', authenticate , validateParams(getChildFoldersSchema) ,  asyncWrapper(folderController.getChildFolders));
router.get('/', authenticate, validateQuery(listRootFoldersSchema) , asyncWrapper(folderController.listRootFolders));
router.patch('/rename/:id', authenticate , validateParams(renameFolderParamsSchema), validateBody(renameFolderSchema), 
asyncWrapper(folderController.renameFolder));
router.post('/dummy', asyncWrapper(folderController.dummyRoute));
router.patch('/move/:id', authenticate , validateParams(moveFolderParamsSchema), validateBody(moveFolderSchema),
asyncWrapper(folderController.moveFolder));
router.delete('/:id', authenticate , validateParams(deleteFolderParamsSchema), asyncWrapper(folderController.deleteFolder));


export default router;  
