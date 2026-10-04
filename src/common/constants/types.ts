export type UploadAttemptArgs = {
    s3UploadId: string;
    partNumber: number;
}

export type Cursor = {
    cursorType: "folder" | "file";
    id: string;
    createdAt: string;
}