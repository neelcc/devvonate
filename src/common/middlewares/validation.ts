
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

export const validateQuery =
    <T>(schema: z.ZodType<T>) =>
    (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.query);
        if (!result.success) return next(result.error);

        (req as any).validatedQuery = result.data;

        next();
    };

export const validateBody =
    <T>(schema: z.ZodType<T>) =>
    (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);
        console.log("Result from validateBody:", result);
        if (!result.success) return next(result.error);
        req.body = result.data;
        next();
    };

export const validateParams =
    <T>(schema: z.ZodType<T>) =>
    (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.params);

        if (!result.success) return next(result.error);
        (req as any).validatedParams = result.data;
        next();
    };
