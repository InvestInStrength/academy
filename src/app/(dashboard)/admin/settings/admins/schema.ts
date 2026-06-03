import { z } from "zod";

export const createAdminSchema = z.object({
  email: z.string().email({ message: "validation.email_invalid" }),
  password: z
    .string()
    .min(8, { message: "validation.password_min" })
    .max(72),
  role: z.enum(["admin", "superadmin"]),
});

export type CreateAdminInput = z.infer<typeof createAdminSchema>;
