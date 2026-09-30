import express from "express";
import { FolderController } from "./folder.controller";
import { FolderServices } from "./folder.services";
import logger from "../config/logger";
import { asyncWrapper } from "../utils/wrapper";
import authenticate from "../common/middlewares/authenticate";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../common/middlewares/validation";
import {
  createFolderSchema,
  listRootFoldersSchema,
  getChildFoldersSchema,
  renameFolderSchema,
  renameFolderParamsSchema,
  moveFolderParamsSchema,
  moveFolderSchema,
  deleteFolderParamsSchema,
  deleteFileParamsSchema,
} from "./folders.validator";

const router = express.Router();
const folderServices = new FolderServices(logger);
const folderController = new FolderController(folderServices, logger);

router.post(
  "/",
  authenticate,
  validateBody(createFolderSchema),
  asyncWrapper(folderController.createFolder),
);
router.get(
  "/:id",
  authenticate,
  validateParams(getChildFoldersSchema),
  asyncWrapper(folderController.getChildFolders),
);

router.patch(
  "/rename/:id",
  authenticate,
  validateParams(renameFolderParamsSchema),
  validateBody(renameFolderSchema),
  asyncWrapper(folderController.renameFolder),
);
router.patch(
  "/move/:id",
  authenticate,
  validateParams(moveFolderParamsSchema),
  validateBody(moveFolderSchema),
  asyncWrapper(folderController.moveFolder),
);
router.delete(
  "/:id",
  authenticate,
  validateParams(deleteFolderParamsSchema),
  asyncWrapper(folderController.deleteFolder),
);

router.post("/dummy", asyncWrapper(folderController.dummyRoute));

export default router;
