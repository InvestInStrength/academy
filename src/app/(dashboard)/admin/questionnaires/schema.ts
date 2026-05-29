import { z } from "zod";

export const questionnaireSchema = z
  .object({
    course_id: z.string().uuid({ message: "Select a course." }),
    title: z.string().trim().min(1, { message: "Title is required." }).max(200),
    description: z.string().trim().max(2000).optional(),
    passing_percentage: z.coerce
      .number({ invalid_type_error: "Passing percentage must be a number." })
      .int()
      .min(0, { message: "Must be between 0 and 100." })
      .max(100, { message: "Must be between 0 and 100." }),
    randomize_question_order: z.boolean(),
    randomize_answer_order: z.boolean(),
    active: z.boolean(),
    question_ids: z.array(z.string().uuid()),
  })
  .refine((data) => !data.active || data.question_ids.length >= 1, {
    message: "An active questionnaire needs at least one question.",
    path: ["question_ids"],
  });

export type QuestionnaireInput = z.infer<typeof questionnaireSchema>;
