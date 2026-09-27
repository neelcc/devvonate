import { z } from "zod";

export const renameFileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "New File name is required!")
    .max(255, "New File name must be less than 255 characters!"),
});

export const fileParamsSchema = z.object({
  id: z.uuid().trim().min(1, "File ID is required!"),
});

export const moveFileSchema = z.object({
  newParentId: z.uuid().trim().min(1, "New parent folder ID is required!"),
});
