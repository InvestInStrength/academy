import { z } from "zod";

export const participantSchema = z.object({
  full_name: z.string().trim().min(1, { message: "validation.fullname_required" }).max(200),
  certificate_display_name: z.string().trim().max(200).optional(),
  email: z.string().trim().email({ message: "validation.email_invalid" }).optional(),
});

export const assignmentCreateSchema = z.object({
  questionnaire_id: z.string().uuid({ message: "validation.select_questionnaire" }),
  topic_ids: z.array(z.string().uuid()),
});

export const assignmentTopicsSchema = z.object({
  assignment_id: z.string().uuid(),
  topic_ids: z.array(z.string().uuid()),
});

export type ParticipantInput = z.infer<typeof participantSchema>;
