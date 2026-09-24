import { Logger } from "winston";
import { FileService } from "./file.services";
import { Request, Response, NextFunction  } from "express"
import createHttpError from "http-errors";
import { FileParams } from "./file.types";
import id from "zod/v4/locales/id.js";

export class FileController {

    constructor(private fileService: FileService, private logger: Logger) {}

    renameFile = async (req: Request<FileParams> ,res : Response , next: NextFunction) =>{

        const userId = req.auth.sub;
        const fileId = req.params.id;
        const { name } = req.body;

        if(!name){
            const error = createHttpError(400, "Name is required");
            return next(error);
        }
        if(!fileId){
            const error = createHttpError(400, "File ID is required");
            return next(error);
        }
        if(!userId){
            const error = createHttpError(400, "User ID is required");
            return next(error);
        }

        const response = await this.fileService.renameFile(userId, fileId, name);

        res.status(200).json({
            message: "File renamed successfully",
            name: response.name,
            id: response.id
        })
    }

    deleteFile = async (req: Request<FileParams>, res: Response, next: NextFunction) => {
        const userId = req.auth.sub;
        const fileId = req.params.id;

        if(!fileId){
            const error = createHttpError(400, "File ID is required");
            return next(error);
        }

        if(!userId){
            const error = createHttpError(400, "User ID is required");
            return next(error);
        }

        const response = await this.fileService.permanentlyDeleteFile(userId, fileId);

        res.status(200).json({
            message: "File deleted successfully",
            name: response.name,
            id: response.id,
            size: response.size
        })
    }

    restoreFile = async (req: Request<FileParams>, res: Response, next: NextFunction) => {
        const userId = req.auth.sub;
        const fileId = req.params.id;

        if(!fileId){
            const error = createHttpError(400, "File ID is required");
            return next(error);
        }

        if(!userId){
            const error = createHttpError(400, "User ID is required");
            return next(error);
        }

        const response = await this.fileService.restoreFile(userId, fileId);

        res.status(200).json({
            message: "File restored successfully",
            name: response.name,
            id: response.id,
            size: response.size
        })
    }

    getTrashFiles = async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.auth.sub;

        if(!userId){
            const error = createHttpError(400, "User ID is required");
            return next(error);
        }

        const files = await this.fileService.getTrashFiles(userId);


        res.status(200).json({
            message: "Trash files retrieved successfully",
            items : files,
            total : files.length
        })
    }

    moveFile = async (req: Request<FileParams>, res: Response, next: NextFunction) => {
        const userId = req.auth.id;
        const fileId = req.params.id;
        const { newParentId } = req.body;

        if(!fileId){
            const error = createHttpError(400, "File ID is required");
            return next(error);
        }

        if(!newParentId){
            const error = createHttpError(400, "New parent folder ID is required");
            return next(error);
        }

        if(!userId){
            const error = createHttpError(400, "User ID is required");
            return next(error);
        }

        const response = await this.fileService.moveFile(userId, fileId, newParentId);

        res.status(200).json({
            message: "File moved successfully",
            id: response.id, 
            newFolderId: response.folderId
        })
    }

    permanentlyDeleteFile = async (req: Request<FileParams>, res: Response, next: NextFunction) => {
        const userId = req.auth.id;
        const fileId = req.params.id;

        if(!fileId){
            const error = createHttpError(400, "File ID is required");
            return next(error);
        }

        if(!userId){
            const error = createHttpError(400, "User ID is required");
            return next(error);
        }

        const response = await this.fileService.permanentlyDeleteFile(userId, fileId);

        res.status(200).json({
            message: "File permanently deleted successfully",
            id: response.id,
            name: response.name
        })

    }

    deleteAllTrashFiles = async (req: Request, res: Response, next: NextFunction) => {
        const userId = req.auth.id;

        if(!userId){
            const error = createHttpError(400, "User ID is required");
            return next(error);
        }

        const deletedFiles = await this.fileService.deleteAllTrashFiles(userId);

        res.status(200).json({
            message: "All trash files deleted successfully",
            count: deletedFiles.count,
        })

    }
    
}