import z from "zod";

export const createFolderSchema = z.object({
    name: z.string()
        .trim()
        .min(1, "Folder name is required!"),
    parentId: z.uuid().optional(),
});

export const getChildFoldersSchema = z.object({
    id: z.uuid().trim().min(1, "Folder ID is required!"),
}); 

export const listRootFoldersSchema = z.object({
    cursor: z.string().optional(),
    pageSize: z.coerce.number().int().min(1).max(20).optional(),
});

export const renameFolderSchema = z.object({
    name: z.string().trim().min(1, "New folder name is required!").max(255, "New folder name must be less than 255 characters!"),
});

export const renameFolderParamsSchema = z.object({
    id: z.uuid().trim().min(1, "Folder ID is required!"),
});

export const moveFolderParamsSchema = z.object({
    id: z.uuid().trim().min(1, "Folder ID is required!"),
});

export const deleteFolderParamsSchema = z.object({
    id: z.string().trim().min(1, "Folder ID is required!"),
}); 

export const deleteFileParamsSchema = z.object({
    id: z.string().trim().min(1, "File ID is required!"),
});

export const moveFolderSchema = z.object({
    newParentId: z.uuid().trim().min(1, "New parent folder ID is required!"),
});