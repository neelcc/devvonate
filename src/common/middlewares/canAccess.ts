// This middleware checks whether the UserToken is role for admin

import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { AuthRequest } from "../../auth/auth.types";

export const canAccess = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const _req = req as AuthRequest;
        const roleFromToken = _req.auth.role;

        if (!roles.includes(roleFromToken)) {
            const error = createHttpError(
                403,
                "You don't have enough permission",
            );
            next(error);
            return;
        }

        next();
    };
};
