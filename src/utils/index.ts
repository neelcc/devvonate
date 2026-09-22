import { Part } from "@aws-sdk/client-s3";
import { MIME_TYPE_CATEGORIES } from "../common/constants";
import { Config } from "../config";
import type { FileCategory } from "../generated/prisma/browser";

export const decodeCursor = (cursor: string) => {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
}

export const encodeCursor = (id: string | undefined, createdAt: Date | undefined ) => {
    return Buffer.from(JSON.stringify({
        id,
        createdAt: createdAt?.toISOString(),    
    })).toString('base64url');
}

export const calculatePartSize = (fileSize: bigint) => {
    const defaultPartSize = BigInt(Config.DEFAULT_PART_SIZE);
    const calculatedPartSize = BigInt(fileSize) / 10n;
    const partSize =
            defaultPartSize > calculatedPartSize
                ? defaultPartSize
                : calculatedPartSize;
    return partSize;
}

export function getFileCategory(
  mimeType: string
): FileCategory | null {
  const normalizedMimeType = mimeType.toLowerCase().trim();

  for (const [category, mimeTypes] of Object.entries(
    MIME_TYPE_CATEGORIES
  )) {
    if (mimeTypes.has(normalizedMimeType)) {
      return category as FileCategory;
    }
  }

  return null;
}

export function fileValidated(contentLength: number, contentType: string, fileSize: bigint, fileContentType: string): boolean {
    if (BigInt(contentLength) !== fileSize) {
        return false;
    }
    if (contentType !== fileContentType) {
        return false;
    }
    return true;
} 


export function isPartsValidated(
  parts: { ETag: string; PartNumber: number }[],
  s3Parts: Part[],
): boolean {
  console.log("Both parts lengths:", parts.length, s3Parts.length);

  if (parts.length !== s3Parts.length) {
    return false;
  }

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const s3Part = s3Parts[i];
    if (!part || !s3Part) {
      return false;
    }
    const s3ETag = s3Part.ETag?.replace(/^"|"$/g, "");
    
    if (
      part.ETag !== s3ETag ||
      part.PartNumber !== s3Part.PartNumber
    ) {
      return false;
    }
  }

  return true;
}