import { Request } from "express";
import { createFolderSchema } from "./folders.validator";
import { ParamsDictionary } from "express-serve-static-core";

import z from "zod";
import { FileCategory } from "../generated/prisma/enums";

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
  body: {
    name: string;
    parentId?: string;
  };
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


export interface PaginatedResultFolder {
  name: string;
  id: string;
  createdAt: Date;
}

export interface PaginatedResultFile {
  name: string;
  id: string;
  createdAt: Date;
  category: FileCategory;
  folderId: string;
}