import { z } from "zod";

/** Empty select/date inputs post "" — normalize those to undefined so the
 * optional fields below don't fail on an empty string. */
const optionalText = z
  .string()
  .trim()
  .transform((value) => (value.length > 0 ? value : undefined))
  .optional();

export const courseSchema = z.object({
  /** Immutable after creation — `updateCourse` reads the stored kind rather
   * than trusting the client, so a course can never become a seminar. */
  kind: z.enum(["course", "seminar"]),
  title: z.string().trim().min(1, { message: "validation.title_required" }).max(200),
  title_en: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  description_en: z.string().trim().max(2000).optional(),
  /** Seminars only: the day the event was held (`YYYY-MM-DD` from an
   * `<input type="date">`). Ignored — and cleared — for a course. */
  event_date: optionalText.refine(
    (value) => value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(value),
    { message: "validation.invalid_date" },
  ),
  /** Certificate artwork for this course/seminar; empty means "use the
   * built-in template for the kind". */
  certificate_template_id: optionalText.refine(
    (value) =>
      value === undefined ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
    { message: "validation.generic_error" },
  ),
  active: z.boolean(),
});

export type CourseInput = z.infer<typeof courseSchema>;
