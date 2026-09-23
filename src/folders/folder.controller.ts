import { Logger } from "winston";
import { FolderServices } from "./folder.services";
import { NextFunction, Request, Response } from "express";
import { AuthRequest } from "../auth/auth.types";
import createHttpError from "http-errors";
import { GetAllFoldersQuery, GetFolderParams, MoveFolderParams, RenameFolderRequest } from "./folder.types";
import { listRootFoldersSchema } from "./folders.validator";

export class FolderController {

    constructor(
        private folderServices: FolderServices,
        private logger: Logger,
    ) { }

     createFolder = async (req: Request, res: Response, next: NextFunction) => {
        const { name, parentId } = req.body;
       
        const userId = (req as AuthRequest).auth.sub;
        
        const folder = await this.folderServices.createFolder({ name, parentId }, userId);

        res.status(201).json({
            message: "Folder created successfully",
            folder: folder
        })
    }

    getChildFolders = async (req: Request<GetFolderParams>, res: Response, next: NextFunction) => {

        const userId = req.auth.sub;
        const folders = await this.folderServices.getChildFolders( req.params.id , userId);
        
        res.status(200).json({
            message: "Folder retrieved successfully",
            folders: folders
        })
    }

    listRootFolders = async (req: Request<GetAllFoldersQuery>, res: Response, next: NextFunction) => {
        
        const userId = req.auth.sub;
        const { cursor, pageSize } = listRootFoldersSchema.parse(req.query);

        const folders = await this.folderServices.listRootFolders(userId, cursor, pageSize );

        res.status(200).json({
            message: "Folders retrieved successfully",  
            folders: folders
        })
    }

    renameFolder = async (req: RenameFolderRequest, res: Response, next: NextFunction) => {
        const folderId = req.params.id;
        const newName = req.body.name;
        const userId = (req as AuthRequest).auth.sub;

        if(!folderId) {
            const error = createHttpError(400, "Folder ID is required");
            throw error;
        }

        if(!newName) {
            const error = createHttpError(400, "New folder name is required");
            throw error;
        }

        const folder = await this.folderServices.renameFolder(folderId, newName, userId);

        res.status(200).json({
            message: "Folder renamed successfully",
            folder: folder
        })
    }

    moveFolder = async (req: Request<MoveFolderParams>, res: Response, next: NextFunction) => {
        const folderId = req.params.id;
        const newParentId = req.body.newParentId;
        const userId = (req as AuthRequest).auth.sub;

        

        if(!folderId) {
            const error = createHttpError(400, "Folder ID is required");
            throw error;
        }

        if(!newParentId) {
            const error = createHttpError(400, "New parent folder ID is required");
            throw error;
        }

        if(!userId) {
            const error = createHttpError(400, "User ID is required");
            throw error;
        }

        const folder = await this.folderServices.moveFolder(folderId, newParentId, userId);

        res.status(200).json({
            message: "Folder moved successfully",
            folder: folder
        })
    }

    deleteFolder = async (req: Request, res: Response, next: NextFunction) => {
        const folderId = req.params.id;
        const userId = (req as AuthRequest).auth.sub;

        if(!folderId) {
            const error = createHttpError(400, "Folder ID is required");
            next(error);
            return;
        }

        const folder = await this.folderServices.deleteFolder(folderId as string, userId);

        res.status(200).json({
            message: "Folder deleted successfully",
            folder: folder
    
        })
    }

    dummyRoute = async (req: Request, res: Response, next: NextFunction) => {
        console.log(req.hostname)
        console.log(req.host)
        console.log(req.acceptsEncodings())
        console.log(req.xhr)
        res.send("This is a dummy route for testing purposes");
    }

     }

