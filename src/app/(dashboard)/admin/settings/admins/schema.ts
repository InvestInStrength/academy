import { z } from "zod";

export const createAdminSchema = z.object({
  email: z.string().email({ message: "Enter a valid email." }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." })
    .max(72),
  role: z.enum(["admin", "superadmin"]),
});

export type CreateAdminInput = z.infer<typeof createAdminSchema>;
