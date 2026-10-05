import { Logger } from "winston";
import { FolderServices } from "./folder.services";
import { NextFunction, Request, Response } from "express";
import { AuthRequest } from "../auth/auth.types";
import createHttpError from "http-errors";
import {
  FolderParams,
  GetAllFoldersQuery,
} from "./folder.types";

export class FolderController {
  constructor(
    private folderServices: FolderServices,
    private logger: Logger,
  ) {}

  createFolder = async (req: Request, res: Response, next: NextFunction) => {
    const { name, parentId } = req.body;

    const userId = (req as AuthRequest).auth.sub;

    const folder = await this.folderServices.createFolder(
      { name, parentId },
      userId,
    );

    res.status(201).json({
      message: "Folder created successfully",
      name: folder.name,
      id: folder.id,
      parentId: folder.parentFolderId,
      userId: folder.userId,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    });
  };

  getChildFolders = async (
    req: Request<FolderParams>,
    res: Response,
    next: NextFunction,
  ) => {
    const userId = req.auth.sub;
    const cursor = req.query.cursor as string | undefined;
    const folderId = req.params.id;

    if (!folderId) {
      const error = createHttpError(400, "Folder ID is required");
      throw error;
    }  

    const { folders, files, nextCursor } = await this.folderServices.getChildFolders(
      folderId,
      userId,
      cursor,
    );

    res.status(200).json({
      message: "Folder retrieved successfully",
      data: {
        folders: folders,
        files: files,
      },
      nextCursor: nextCursor,
    });

  };

 
  renameFolder = async (
    req: Request<FolderParams>,
    res: Response,
    next: NextFunction,
  ) => {
    const folderId = req.params.id;
    const { name } = req.body;
    const userId = (req as AuthRequest).auth.sub;

    if (!folderId) {
      const error = createHttpError(400, "Folder ID is required");
      throw error;
    }

    if (!name) {
      const error = createHttpError(400, "New folder name is required");
      throw error;
    }

    const folder = await this.folderServices.renameFolder(
      folderId,
      name,
      userId,
    );

    res.status(200).json({
      message: "Folder renamed successfully",
      name: folder.name,
      id: folder.id,
      parentId: folder.parentFolderId,
    });
  };

  moveFolder = async (
    req: Request<FolderParams>,
    res: Response,
    next: NextFunction,
  ) => {
    console.log("req.body i called", req.body);
    const folderId = req.params.id;
    const newParentId = req.body.newParentId;
    const userId = (req as AuthRequest).auth.sub;

    if (!folderId) {
      const error = createHttpError(400, "Folder ID is required");
      throw error;
    }

    if (!newParentId) {
      const error = createHttpError(400, "New parent folder ID is required");
      throw error;
    }

    if (!userId) {
      const error = createHttpError(400, "User ID is required");
      throw error;
    }

    const folder = await this.folderServices.moveFolder(
      folderId,
      newParentId,
      userId,
    );

    res.status(200).json({
      message: "Folder moved successfully",
      name: folder.name,
      id: folder.id,
      parentId: folder.parentFolderId,
      updatedAt: folder.updatedAt,
    });
  };

  deleteFolder = async (req: Request<FolderParams>, res: Response, next: NextFunction) => {
    const folderId = req.params.id;
    const userId = (req as AuthRequest).auth.sub;

    if (!folderId) {
      const error = createHttpError(400, "Folder ID is required");
      next(error);
      return;
    }

    const { result, folders } = await this.folderServices.deleteFolder(
      folderId,
      userId,
    );

    res.status(200).json({
      message: "Folder deleted successfully",
      folders: folders,
      result: result,
    });
  };

  

  dummyRoute = async (req: Request, res: Response, next: NextFunction) => {
    console.log(req.hostname);
    console.log(req.host);
    console.log(req.acceptsEncodings());
    console.log(req.xhr);
    res.send("This is a dummy route for testing purposes");
  };
}
