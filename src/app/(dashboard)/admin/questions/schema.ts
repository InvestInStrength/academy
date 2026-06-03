import { z } from "zod";

const optionSchema = z.object({
  option_text: z.string().trim().min(1, { message: "validation.option_text_required" }).max(2000),
  option_text_en: z.string().trim().max(2000).optional(),
  is_correct: z.boolean(),
});

export const questionSchema = z
  .object({
    course_id: z.string().uuid({ message: "validation.select_course" }),
    topic_id: z.string().uuid().nullable(),
    question_text: z
      .string()
      .trim()
      .min(1, { message: "validation.question_text_required" })
      .max(5000),
    question_text_en: z.string().trim().max(5000).optional(),
    question_type: z.enum(["single_choice", "multiple_choice"]),
    explanation: z.string().trim().max(5000).optional(),
    explanation_en: z.string().trim().max(5000).optional(),
    recommendation_text: z.string().trim().max(5000).optional(),
    recommendation_text_en: z.string().trim().max(5000).optional(),
    active: z.boolean(),
    options: z
      .array(optionSchema)
      .min(2, { message: "validation.options_min" })
      .max(12, { message: "validation.options_max" }),
  })
  .refine((data) => data.options.some((option) => option.is_correct), {
    message: "validation.options_one_correct",
    path: ["options"],
  })
  .refine(
    (data) =>
      data.question_type !== "single_choice" ||
      data.options.filter((option) => option.is_correct).length === 1,
    {
      message: "validation.single_choice_one_correct",
      path: ["options"],
    },
  );

export type QuestionInput = z.infer<typeof questionSchema>;
