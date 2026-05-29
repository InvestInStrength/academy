import { z } from "zod";

export const courseSchema = z.object({
  title: z.string().trim().min(1, { message: "Title is required." }).max(200),
  description: z.string().trim().max(2000).optional(),
  active: z.boolean(),
});

export type CourseInput = z.infer<typeof courseSchema>;
