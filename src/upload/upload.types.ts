import { ParamsDictionary } from "express-serve-static-core";

export interface FileData {
  fileName: string;
  size: bigint;
  contentType: string;
}

export interface UploadRouteParams extends ParamsDictionary {
  fileUploadId: string;
}

export interface PartStatusRouteParams extends ParamsDictionary {
  fileUploadId: string;
  partNumber: string;
}