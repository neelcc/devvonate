import { FileCategory } from "../../generated/prisma/browser";

export const Roles = {
    User: "user",
    Admin: "admin",
} as const;


export const MIME_TYPE_CATEGORIES = {
  [FileCategory.DOCUMENT]: new Set([
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/rtf",
  ]),

  [FileCategory.IMAGE]: new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ]),

  [FileCategory.AUDIO]: new Set([
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/mp4",
    "audio/aac",
    "audio/flac",
  ]),

  [FileCategory.VIDEO]: new Set([
    "video/mp4",
    "video/webm",
    "video/x-matroska",
    "video/x-msvideo",
    "video/quicktime",
  ]),

  [FileCategory.ARCHIVE]: new Set([
    "application/zip",
    "application/vnd.rar",
    "application/x-rar-compressed",
    "application/x-7z-compressed",
    "application/x-tar",
    "application/gzip",
    "application/octet-stream",
  ]),
};
