import express from "express";
import { DownloadServices } from "./download.service";
import { DownloadController } from "./download.controller";
import logger from "../config/logger";
import { asyncWrapper } from "../utils/wrapper";
import authenticate from "../common/middlewares/authenticate";


const router = express.Router();
const downloadServices = new DownloadServices();
const downloadController = new DownloadController(downloadServices, logger);

router.post('/:fileId', authenticate ,asyncWrapper(downloadController.downloadFile));
