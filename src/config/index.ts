import { config } from "dotenv";
import path from "path";


config({
    path: path.join(process.cwd(), `.env.${process.env.NODE_ENV || "dev"}`),
});

function required(value: string | undefined, name: string): string {
    if (!value) {
        console.log(name);

        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

export const Config = {
    PORT: Number(required(process.env.PORT, "PORT")),
    NODE_ENV: required(process.env.NODE_ENV, "NODE_ENV"),
    ALLOWED_ORIGINS: required(process.env.ALLOWED_ORIGINS, "ALLOWED_ORIGINS"),
    DATABASE_URL: required(process.env.DATABASE_URL, "DATABASE_URL"),
}