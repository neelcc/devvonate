import { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { HttpError } from "http-errors";
import { ZodError } from "zod";

export const globalErrorHandler = (
    err: HttpError,
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const errorId = uuidv4();

    let statusCode = err.status || 500;
    const isProduction = process.env.NODE_ENV === "production";
    let message = isProduction
        ? `An unexpected error occurred.`
        : err.message;

    if(err instanceof ZodError) {
       res.status(statusCode).json({
        errors: [
            {
                ref: errorId,
                type: err.name,
                msg: message,
                path: req.path,
                location: "server",
                stack: isProduction ? null : err.stack,
            },
        ],
    });
    }
    
    // console.log(err.message, {
    //     id: errorId,
    //     error: err.stack,
    //     path: req.path,
    //     method: req.method,
    // });

    res.status(statusCode).json({
        errors: [
            {
                ref: errorId,
                type: err.name,
                msg: message,
                path: req.path,
                location: "server",
                stack: isProduction ? null : err.stack,
            },
        ],
    });
};

