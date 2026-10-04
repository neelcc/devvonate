import z from "zod";

export const uploadFileSchema = z.object({
  fileName: z.string().trim().min(1, "File name is required!"),
  size: z.number().int().positive("File size must be a positive integer!"),
  contentType: z.string().trim().min(1, "File content type is required!"),
  folderId: z.string().trim().min(1, "Folder ID is required!"),
  sha256: z.string().trim().min(1, "SHA256 hash is required!"),
});

export const uploadRouteParamsSchema = z.object({
  fileUploadId: z.string("Upload ID is required"),
});


export const uploadCompleteSchema = z.object({
  parts: z.array(z.object({
    PartNumber: z.number().int().min(1).max(10000),
    ETag: z.string().min(1),
  })).min(1).max(10000),
}); 