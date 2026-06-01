import { z } from "zod";

export const topicSchema = z.object({
  course_id: z.string().uuid({ message: "Invalid course." }),
  title: z.string().trim().min(1, { message: "Title is required." }).max(200),
  title_en: z.string().trim().max(200).optional(),
  code: z.string().trim().max(50).optional(),
  sort_order: z.coerce
    .number({ invalid_type_error: "Order must be a number." })
    .int()
    .min(0)
    .max(100000),
  active: z.boolean(),
});

export type TopicInput = z.infer<typeof topicSchema>;
