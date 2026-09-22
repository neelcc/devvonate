import { z } from "zod";

export const registerSchema = z.object({
    firstName: z
        .string()
        .min(2, "First name must be at least 2 characters")
        .transform((val) => val.trim()),

    lastName: z
        .string()
        .min(2, "Last name must be at least 2 characters")
        .transform((val) => val.trim()),

    email: z.string().transform((val) => val.trim().toLowerCase()),

    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(12, "Password must be at least 12 characters")
        .transform((val) => val.trim()),
});

export const loginSchema = z.object({
    email: z.string().transform((val) => val.trim().toLowerCase()),

    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(12, "Password must be at least 12 characters")
        .transform((val) => val.trim()),
});


export const userIdSchema = z.object({
    id : z.
         coerce.string("Invalid Url Params")
})


export const updateUserSchema = z.object({
    firstName: z.string()
        .trim()
        .min(1, "First name is required!"),
    
    lastName: z.string()
        .trim()
        .min(1, "Last name is required!"),
    
    role: z.string()
        .trim()
        .min(1, "Role is required!"),
    
    email: z
        .string()
        .trim()
        .min(1, "Email is required!"),
    
})
