import { ParamsDictionary } from "express-serve-static-core";


export interface FileParams extends ParamsDictionary {
    id: string;
}