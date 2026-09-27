import express from "express";
import logger from "../config/logger";
import { FileService } from "./file.services";
import { FileController } from "./file.controller";
import authenticate from "../common/middlewares/authenticate";
import { asyncWrapper } from "../utils/wrapper";
import { validateBody, validateParams } from "../common/middlewares/validation";
import {
  fileParamsSchema,
  moveFileSchema,
  renameFileSchema,
} from "./file.validation";

const router = express.Router();
const fileService = new FileService();
const fileController = new FileController(fileService, logger);

router.patch(
  "/rename/:id",
  authenticate,
  validateBody(renameFileSchema),
  validateParams(fileParamsSchema),
  asyncWrapper(fileController.renameFile),
);
router.delete(
  "/delete/:id",
  authenticate,
  validateParams(fileParamsSchema),
  asyncWrapper(fileController.deleteFile),
);
router.post(
  "/restore/:id",
  authenticate,
  validateParams(fileParamsSchema),
  asyncWrapper(fileController.restoreFile),
);
router.get("/trash", authenticate, asyncWrapper(fileController.getTrashFiles));
router.patch(
  "/move/:id",
  authenticate,
  validateBody(moveFileSchema),
  validateParams(fileParamsSchema),
  asyncWrapper(fileController.moveFile),
);
router.delete(
  "/permanent-delete/:id",
  authenticate,
  validateParams(fileParamsSchema),
  asyncWrapper(fileController.deleteFile),
);
router.delete(
  "/delete-all-trash",
  authenticate,
  asyncWrapper(fileController.deleteAllTrashFiles),
);
export default router;
