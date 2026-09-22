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
    DATABASE_URL: required(process.env.DATABASE_URL, "DATABASE_URL"),
    PRIVATE_KEY: required(process.env.PRIVATE_KEY, "PRIVATE_KEY"),
    REFRESH_TOKEN_SECRET: required(process.env.REFRESH_TOKEN_SECRET, "REFRESH_TOKEN_SECRET"),
    JWKS_URI: required(process.env.JWKS_URI, "JWKS_URI"),
    DEFAULT_PART_SIZE: (required(process.env.DEFAULT_PART_SIZE, "DEFAULT_PART_SIZE")),
    FREE_TIER_BYTES: BigInt(required(process.env.FREE_TIER_BYTES, "FREE_TIER_BYTES")),
    aws : {
        accessKeyId: required(process.env.AWS_ACCESS_KEY_ID, "AWS_ACCESS_KEY_ID"),
        secretAccessKey: required(process.env.AWS_SECRET_ACCESS_KEY, "AWS_SECRET_ACCESS_KEY"),
        region: required(process.env.AWS_REGION, "AWS_REGION"),
        bucketName: required(process.env.AWS_BUCKET_NAME, "AWS_BUCKET_NAME"),
    }
}