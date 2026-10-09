import { Request } from "express";
import { createFolderSchema } from "./folders.validator";
import { ParamsDictionary } from "express-serve-static-core";

import z from "zod";
import { FileCategory, FileStatus, FolderStatus } from "../generated/prisma/enums";

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

export interface FolderParams extends ParamsDictionary {
  id: string;
}


export interface GetAllFoldersQuery {
  cursor?: string;
  pageSize?: number;
}


export interface PaginatedResultFolder {
  id: string;
  name: string;
  userId: string;
  parentFolderId: string | null;
  status: FolderStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface PaginatedResultFile {
  name: string;
  id: string;
  userId: string;
  size: string;
  status: FileStatus;
  updatedAt: Date;
  deletedAt: Date | null;
  createdAt: Date;
  category: FileCategory;
  folderId: string;
}

export interface DeleteFolderBatch {
  folderIds: string[];
  fileIds : string[];
}

