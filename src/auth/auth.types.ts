import type { Request } from "express";

enum Role {
    ADMIN = "admin",
    USER = "user",
}

export interface UserData {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role : Role;
}

export interface RegisterUserRequest extends Request {
    body: UserData;
}

export interface UserLoginData {
    email: string;
    password: string;
}

export interface CreateUserRequest extends Request {
    body: UserData;
}

export interface LoginUserRequest extends Request {
    body: UserLoginData;
}

export interface AuthRequest extends Request {
    auth: {
            sub: string;
            role: string;
            id?: string;
            firstName: string;
            lastName: string;
            email: string;
    };
}

export type AuthCookie = {
    accessToken: string;
    refreshToken: string;
};

export interface IRefreshTokenPayload {
    id: number;
}


export interface UserQueryId {
    id: number;
} 

export interface UserParams {
    id : number;
}

export interface UserQuery {
    q: string;
    perPage: number;
    currentPage: number;
    role?: string;
}


export interface LimitedUserData {
    firstName: string;
    lastName: string;
    email: string;
    role : string;
}

export interface UserValidatedRequest extends Request {
    body : UserData;
    validatedQuery?: UserQuery;
    validatedParams?: UserParams;
}

export interface UserLimitedDataRequest extends Request {
    body : LimitedUserData;
    validatedQuery?: UserQuery;
    validatedParams?: UserParams;
}



export interface AuthenticatedCreateUserRequest  extends Request {
    auth : AuthRequest['auth']
    body : UserData
}
