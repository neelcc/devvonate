import createHttpError from "http-errors";
import { UserData } from "./auth.types";
import bcrypt from "bcrypt";
import { Config } from "../config";
import jwt, { JwtPayload } from "jsonwebtoken";
import { User } from "../generated/prisma/client";
import prisma from "../config/prisma";
import { OnboardServices } from "../onboard/onboard.services";
import { Logger } from "winston";


export class AuthServices {
    constructor(
        private OnboardServices: OnboardServices,
        private logger: Logger
    ){}

     async create({
        firstName,
        lastName,
        email,
        password,
    }: UserData)  {
        const user = await this.findByEmail(email);
    
        if (user) {
            const err = createHttpError(400, "Email is already exists!");
            throw err;
        }

        try {   
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(password, saltRounds);
            return await prisma.$transaction(async (tx) => {

            const newUser = await tx.user.create({
                data : {
                    email,
                    firstName,
                    lastName,
                    password: hashedPassword,
                    
                } 
            })

            this.logger.info(`User created with ID: ${newUser.id}`);

            await this.OnboardServices.initializeUser(tx, newUser.id);
            
        
            return newUser;
            })
        } catch (err) {
            console.error("Error while creating user:", err);
            const error = createHttpError(500, "Failed to store data in db");
            throw error;
        }
    }

    async findByEmail(email: string) {
        return await prisma.user.findUnique({
            where: { email },
        },
        
    );
    }

    async findById(id: string) {
        const user = await prisma.user.findUnique({
            where: { 
                id : id
             },
        }); 
        if (!user) {
            const error = createHttpError(404, "User not found");
            throw error;
        }
        return user;
    }

    async comparePassword(userPassword: string, passwordHash: string) {
        return await bcrypt.compare(userPassword, passwordHash);
    }

      generateAccessToken(payload: JwtPayload) {
        let privateKey: string;

        try {
            console.log(Config.PRIVATE_KEY);
            if (!Config.PRIVATE_KEY) {
                const error = createHttpError(
                    500,
                    "Private key is not defined in environment variables",
                );
                throw error;
            }

            privateKey = Config.PRIVATE_KEY;

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err) {
            const error = createHttpError(
                500,
                "Error while reading private key",
            );
            throw error;
        }

        const accessToken = jwt.sign(payload, privateKey, {
            algorithm: "RS256",
            issuer: "auth-service",
            expiresIn: "1h",
        });

        return accessToken;
    }

    generateRefreshToken(payload: JwtPayload) {
        const refreshToken = jwt.sign(payload, Config.REFRESH_TOKEN_SECRET, {
            algorithm: "HS256",
            issuer: "auth-service",
            expiresIn: "1y",
            jwtid: String(payload.id),
        });

        return refreshToken;
    }

    async persistRefreshToken(user: User) {
        const MS_IN_YEAR = 1000 * 60 * 60 * 24 * 365;
        const newRefreshToken = await prisma.refreshToken.create({
            data : {
                user : {
                    connect : {
                        id : user.id
                    }
                },
                expiresAt : new Date(Date.now() + MS_IN_YEAR)
            }
        })
        return newRefreshToken;
    }

    async deleteRefreshToken(tokenId: number) {
        return await prisma.refreshToken.delete({
            where: { id: tokenId },
        });
    }


}