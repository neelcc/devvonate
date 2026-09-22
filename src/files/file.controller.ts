import { Logger } from "winston";
import { FileService } from "./file.services";

export class FileController {

    constructor(private fileService: FileService, private logger: Logger) {}

}