import { ParamsDictionary } from "express-serve-static-core";

export interface FileData {
  fileName: string;
  size: bigint;
  contentType: string;
}

export interface UploadRouteParams extends ParamsDictionary {
  uploadId: string;
}

export interface PartStatusRouteParams extends ParamsDictionary {
  uploadId: string;
  partNumber: string;
}