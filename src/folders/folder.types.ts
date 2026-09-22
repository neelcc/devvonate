import { Request } from "express";
import { createFolderSchema } from "./folders.validator";
import { ParamsDictionary } from "express-serve-static-core";

import z from "zod";

export type CreateFolderData = z.infer<typeof createFolderSchema>;


export interface Folder {
  id?: string;
  name: string;
  parentId: string | null;
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;  
}

export interface CreateFolderRequest extends Request {
  body : {
    name: string;
    parentId?: string;
  }
}

export interface RenameFolderRequest extends Request {
    params: {
        id: string;
    };
    body: {
        name: string;
    };
}

export interface GetFolderParams extends ParamsDictionary {
    id: string;
}

export interface MoveFolderParams extends ParamsDictionary {
    id: string;
}

export interface GetAllFoldersQuery {
    cursor?: string;
    pageSize?: number;
}