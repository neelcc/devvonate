import "express";

declare global {
    namespace Express {
        interface Request {
            auth: {
                sub: string;
                role: string;
                id?: string;
                firstName: string;
                lastName: string;
                email: string;
            };
        }
    }
}