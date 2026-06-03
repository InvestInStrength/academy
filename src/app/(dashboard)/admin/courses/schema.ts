import { z } from "zod";

export const courseSchema = z.object({
  title: z.string().trim().min(1, { message: "validation.title_required" }).max(200),
  title_en: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  description_en: z.string().trim().max(2000).optional(),
  active: z.boolean(),
});

export type CourseInput = z.infer<typeof courseSchema>;
