import { Logger } from "winston";
import { AuthServices } from "./auth.services";
import { NextFunction, Response } from "express";
import { JwtPayload } from "jsonwebtoken";
import { AuthRequest, LoginUserRequest, RegisterUserRequest } from "./auth.types";
import createHttpError from "http-errors";

export class AuthController {

    constructor(
        private authServices: AuthServices,
        private logger: Logger,
    ) {}

    async register(
        req: RegisterUserRequest,
        res: Response,
        next: NextFunction,
    ) {
        try {
            this.logger.debug("Checking inputs from user", {
                ...req.body,
                password: "********",
            });
                     
            console.log("Request body : ", req.body)
            const user = await this.authServices.create(req.body);

            this.logger.info("User after saving : ",user)
            
            const payload: JwtPayload = {
                sub: String(user.id),
                role: user.role,
            };

            const accessToken = this.authServices.generateAccessToken(payload);
            const newRefreshToken =
                await this.authServices.persistRefreshToken(user);

            const refreshToken = this.authServices.generateRefreshToken({
                ...payload,
                id: String(newRefreshToken.id),
            });

            this.logger.info("User has been created!", { id: user.id });

            res.cookie("accessToken", accessToken, {
                domain: "localhost",
                sameSite: "strict",
                httpOnly: true,
                maxAge: 1000 * 60 * 60,
            });

            res.cookie("refreshToken", refreshToken, {
                domain: "localhost",
                sameSite: "strict",
                httpOnly: true,
                maxAge: 1000 * 60 * 60,
            });

            res.status(201).json({
                id: user.id,
                role: user.role,
            });
        } catch (err) {
            next(err);
        }
    }

    async login(req: LoginUserRequest, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body;

            this.logger.debug("Checking inputs from user", {
                email,
                password: "********",
            });

            const user = await this.authServices.findByEmail(email);

            if (!user) {
                const error = createHttpError(400, "User not found!");
                next(error);
                return;
            }

            const passwordMatch = await this.authServices.comparePassword(
                password,
                user.password,
            );

            if (!passwordMatch) {
                const error = createHttpError(400, "Invalid Credentials!");
                next(error);
                return;
            }
            this.logger.info("User has been logged in!", { id: user.id });

            const payload: JwtPayload = {
                sub: String(user.id),
                role: user.role,
            };

            const accessToken = this.authServices.generateAccessToken(payload);
            const newRefreshToken =
                await this.authServices.persistRefreshToken(user);

            const refreshToken = this.authServices.generateRefreshToken({
                ...payload,
                id: String(newRefreshToken.id),
            });

            res.cookie("accessToken", accessToken, {
                domain: "localhost",
                sameSite: "strict",
                httpOnly: true,
                maxAge: 1000 * 60 * 60,
            });

            res.cookie("refreshToken", refreshToken, {
                domain: "localhost",
                sameSite: "strict",
                httpOnly: true,
                maxAge: 1000 * 60 * 60,
            });

            res.status(201).json({
                email,
                id: user.id,
                role: user.role,
                
            });
        } catch (err) {
            next(err);
        }
    }

    async self(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            console.log("Request auth : ", req.auth)
            const user = await this.authServices.findById(req.auth.sub);
            res.status(201).send({
                id: user?.id,
                firstName: user?.firstName,
            });
        } catch (err) {
            console.log(err);

            next(err);
        }
    }

    async refresh(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const payload: JwtPayload = {
                sub: req.auth.sub,
                role: req.auth.role,
            };

            const accessToken = this.authServices.generateAccessToken(payload);

            const user = await this.authServices.findById(req.auth.sub);
            if (!user) {
                const error = createHttpError(
                    400,
                    "User with the token could not find",
                );
                next(error);
                return;
            }

            // Persist the refresh token
            const newRefreshToken =
                await this.authServices.persistRefreshToken(user);

            await this.authServices.deleteRefreshToken(Number(req.auth.id));

            const refreshToken = this.authServices.generateRefreshToken({
                ...payload,
                id: String(newRefreshToken.id),
            });

            console.log(refreshToken);

            res.cookie("accessToken", accessToken, {
                domain: "localhost",
                sameSite: "strict",
                maxAge: 1000 * 60 * 60 * 24 * 1, // 1d
                httpOnly: true, // Very important
            });

            res.cookie("refreshToken", refreshToken, {
                domain: "localhost",
                sameSite: "strict",
                maxAge: 1000 * 60 * 60 * 24 * 365, // 1y
                httpOnly: true, // Very important
            });

            this.logger.info("User has been logged in", { id: user.id });
            res.json({ id: user.id });
        } catch (err) {
            next(err);
            return;
        }
    }

    async logout(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            console.log("Request auth : ", req.auth)
             this.logger.info("User is logging out", { id: req.auth.sub });
            await this.authServices.deleteRefreshToken(Number(req.auth.id));

            this.logger.info("User has been logout", { id: req.auth.sub });

            res.clearCookie("accessToken");
            res.clearCookie("refreshToken");

            res.json({});
        } catch (error) 
        {
            console.log("Error while logging out",error);
            this.logger.error("Error occurred while logging out", { error });
            next(error);
            return;
        }
    }

    async getStorage(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            console.log("Request auth : ", req.auth)
            console.log("STorage request for user : ", req.auth.sub)
            const user = await this.authServices.findById(req.auth.sub);
            const storage = await this.authServices.getUserStorage(req.auth.sub);
            console.log("Storage fetched for user : ", storage)
            console.log("User fetched for storage : ", user)
            if (!user) {
                const error = createHttpError(
                    400,
                    "User with the token could not find",
                );
                next(error);
                return;
            }

            res.status(200).json({
                message: "User storage fetched successfully",
                usedBytes: storage.used,
                totalBytes: storage.total,
            });
        } catch (error) {
            next(error);
            return;
        }
    }

}