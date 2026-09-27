import { ParamsDictionary } from "express-serve-static-core";

export interface DownloadRouteParams extends ParamsDictionary {
  fileId: string;
}
