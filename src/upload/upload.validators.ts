import z from "zod";

export const uploadFileSchema = z.object({
    fileName: z.string().trim().min(1, "File name is required!"),
    size: z.number().int().positive("File size must be a positive integer!"),
    contentType: z.string().trim().min(1, "File content type is required!"),
    folderId: z.string().trim().min(1, "Folder ID is required!"),   
});

export const uploadRouteParamsSchema = z.object({
    uploadId: z.string("Upload ID is required"),
});