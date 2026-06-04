/**
 * Database types mirroring supabase/migrations/0001_core_schema.sql.
 *
 * Hand-maintained (not generated) so the project does not require the Supabase
 * CLI to build. If you change the migration, update this file to match. The
 * shape follows the convention used by `supabase gen types typescript`, so it
 * can be swapped for generated types later without touching call sites.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type QuestionType = "single_choice" | "multiple_choice";
export type AssignmentStatus = "not_started" | "in_progress" | "passed" | "failed";
export type CertificateStatus = "valid" | "revoked";

export type CertificateAssetType =
  | "official_pdf"
  | "official_png_preview"
  | "instagram_story_png"
  | "instagram_feed_png"
  | "instagram_square_png";

export type CertificateTemplateType =
  | "official_certificate"
  | "instagram_story"
  | "instagram_feed"
  | "instagram_square";
export type AdminRole = "admin" | "superadmin";
export type Locale = "de" | "en";

/** Adds the empty Relationships tuple each table needs to satisfy the
 * supabase-js `GenericTable` constraint (we have no PostgREST embeds typed). */
type WithRelationships<T> = { [K in keyof T]: T[K] & { Relationships: [] } };

export type Database = {
  public: {
    Tables: WithRelationships<{
      admin_profiles: {
        Row: {
          id: string;
          email: string | null;
          role: AdminRole;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          role?: AdminRole;
          active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          role?: AdminRole;
          active?: boolean;
          created_at?: string;
        };
      };
      participants: {
        Row: {
          id: string;
          full_name: string;
          certificate_display_name: string | null;
          email: string | null;
          email_confirmed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          full_name: string;
          certificate_display_name?: string | null;
          email?: string | null;
          email_confirmed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          certificate_display_name?: string | null;
          email?: string | null;
          email_confirmed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          title: string;
          title_de: string | null;
          title_en: string | null;
          description: string | null;
          description_de: string | null;
          description_en: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          title_de?: string | null;
          title_en?: string | null;
          description?: string | null;
          description_de?: string | null;
          description_en?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          title_de?: string | null;
          title_en?: string | null;
          description?: string | null;
          description_de?: string | null;
          description_en?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      course_topics: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          title_de: string | null;
          title_en: string | null;
          code: string | null;
          sort_order: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          title_de?: string | null;
          title_en?: string | null;
          code?: string | null;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          title_de?: string | null;
          title_en?: string | null;
          code?: string | null;
          sort_order?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      questions: {
        Row: {
          id: string;
          course_id: string;
          topic_id: string | null;
          question_text: string;
          question_text_de: string | null;
          question_text_en: string | null;
          question_type: QuestionType;
          explanation: string | null;
          explanation_de: string | null;
          explanation_en: string | null;
          recommendation_text: string | null;
          recommendation_text_de: string | null;
          recommendation_text_en: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          topic_id?: string | null;
          question_text: string;
          question_text_de?: string | null;
          question_text_en?: string | null;
          question_type?: QuestionType;
          explanation?: string | null;
          explanation_de?: string | null;
          explanation_en?: string | null;
          recommendation_text?: string | null;
          recommendation_text_de?: string | null;
          recommendation_text_en?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          topic_id?: string | null;
          question_text?: string;
          question_text_de?: string | null;
          question_text_en?: string | null;
          question_type?: QuestionType;
          explanation?: string | null;
          explanation_de?: string | null;
          explanation_en?: string | null;
          recommendation_text?: string | null;
          recommendation_text_de?: string | null;
          recommendation_text_en?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      question_options: {
        Row: {
          id: string;
          question_id: string;
          option_text: string;
          option_text_de: string | null;
          option_text_en: string | null;
          is_correct: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          question_id: string;
          option_text: string;
          option_text_de?: string | null;
          option_text_en?: string | null;
          is_correct?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          question_id?: string;
          option_text?: string;
          option_text_de?: string | null;
          option_text_en?: string | null;
          is_correct?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      certificate_templates: {
        Row: {
          id: string;
          name: string;
          svg_template: string | null;
          template_type: CertificateTemplateType;
          width: number | null;
          height: number | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          svg_template?: string | null;
          template_type?: CertificateTemplateType;
          width?: number | null;
          height?: number | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          svg_template?: string | null;
          template_type?: CertificateTemplateType;
          width?: number | null;
          height?: number | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      certificate_assets: {
        Row: {
          id: string;
          certificate_id: string;
          asset_type: CertificateAssetType;
          file_url: string;
          mime_type: string;
          width: number | null;
          height: number | null;
          file_size: number | null;
          generated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          certificate_id: string;
          asset_type: CertificateAssetType;
          file_url: string;
          mime_type: string;
          width?: number | null;
          height?: number | null;
          file_size?: number | null;
          generated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          certificate_id?: string;
          asset_type?: CertificateAssetType;
          file_url?: string;
          mime_type?: string;
          width?: number | null;
          height?: number | null;
          file_size?: number | null;
          generated_at?: string;
          created_at?: string;
        };
      };
      questionnaires: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          title_de: string | null;
          title_en: string | null;
          description: string | null;
          description_de: string | null;
          description_en: string | null;
          passing_percentage: number;
          randomize_question_order: boolean;
          randomize_answer_order: boolean;
          active: boolean;
          certificate_template_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          title_de?: string | null;
          title_en?: string | null;
          description?: string | null;
          description_de?: string | null;
          description_en?: string | null;
          passing_percentage?: number;
          randomize_question_order?: boolean;
          randomize_answer_order?: boolean;
          active?: boolean;
          certificate_template_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          course_id?: string;
          title?: string;
          title_de?: string | null;
          title_en?: string | null;
          description?: string | null;
          description_de?: string | null;
          description_en?: string | null;
          passing_percentage?: number;
          randomize_question_order?: boolean;
          randomize_answer_order?: boolean;
          active?: boolean;
          certificate_template_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      questionnaire_questions: {
        Row: {
          id: string;
          questionnaire_id: string;
          question_id: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          questionnaire_id: string;
          question_id: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          questionnaire_id?: string;
          question_id?: string;
          sort_order?: number;
          created_at?: string;
        };
      };
      certification_assignments: {
        Row: {
          id: string;
          participant_id: string;
          questionnaire_id: string;
          access_token: string;
          status: AssignmentStatus;
          active: boolean;
          passed_at: string | null;
          passed_by_admin: string | null;
          manual_pass_reason: string | null;
          certificate_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          participant_id: string;
          questionnaire_id: string;
          access_token?: string;
          status?: AssignmentStatus;
          active?: boolean;
          passed_at?: string | null;
          passed_by_admin?: string | null;
          manual_pass_reason?: string | null;
          certificate_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          participant_id?: string;
          questionnaire_id?: string;
          access_token?: string;
          status?: AssignmentStatus;
          active?: boolean;
          passed_at?: string | null;
          passed_by_admin?: string | null;
          manual_pass_reason?: string | null;
          certificate_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      certification_assignment_topics: {
        Row: {
          id: string;
          certification_assignment_id: string;
          topic_id: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          certification_assignment_id: string;
          topic_id: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          certification_assignment_id?: string;
          topic_id?: string;
          sort_order?: number;
          created_at?: string;
        };
      };
      attempts: {
        Row: {
          id: string;
          certification_assignment_id: string;
          attempt_number: number;
          started_at: string;
          submitted_at: string | null;
          score_percentage: number | null;
          correct_count: number | null;
          wrong_count: number | null;
          passed: boolean | null;
          attempt_snapshot: Json | null;
          recommendation_snapshot: Json | null;
          answers: Json | null;
          language: Locale;
          created_at: string;
        };
        Insert: {
          id?: string;
          certification_assignment_id: string;
          attempt_number: number;
          started_at?: string;
          submitted_at?: string | null;
          score_percentage?: number | null;
          correct_count?: number | null;
          wrong_count?: number | null;
          passed?: boolean | null;
          attempt_snapshot?: Json | null;
          recommendation_snapshot?: Json | null;
          answers?: Json | null;
          language?: Locale;
          created_at?: string;
        };
        Update: {
          id?: string;
          certification_assignment_id?: string;
          attempt_number?: number;
          started_at?: string;
          submitted_at?: string | null;
          score_percentage?: number | null;
          correct_count?: number | null;
          wrong_count?: number | null;
          passed?: boolean | null;
          attempt_snapshot?: Json | null;
          recommendation_snapshot?: Json | null;
          answers?: Json | null;
          language?: Locale;
          created_at?: string;
        };
      };
      attempt_answers: {
        Row: {
          id: string;
          attempt_id: string;
          question_id: string | null;
          question_snapshot: Json;
          selected_option_ids: string[];
          selected_option_snapshots: Json | null;
          correct_option_ids: string[];
          is_correct: boolean | null;
          displayed_question_order: number | null;
          displayed_option_order: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          attempt_id: string;
          question_id?: string | null;
          question_snapshot: Json;
          selected_option_ids?: string[];
          selected_option_snapshots?: Json | null;
          correct_option_ids?: string[];
          is_correct?: boolean | null;
          displayed_question_order?: number | null;
          displayed_option_order?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          attempt_id?: string;
          question_id?: string | null;
          question_snapshot?: Json;
          selected_option_ids?: string[];
          selected_option_snapshots?: Json | null;
          correct_option_ids?: string[];
          is_correct?: boolean | null;
          displayed_question_order?: number | null;
          displayed_option_order?: Json | null;
          created_at?: string;
        };
      };
      certificates: {
        Row: {
          id: string;
          certification_assignment_id: string;
          certificate_number: string;
          verification_token: string;
          file_url: string | null;
          verification_url: string | null;
          certificate_public_snapshot: Json | null;
          status: CertificateStatus;
          revoked_at: string | null;
          revoked_by: string | null;
          revoke_reason: string | null;
          generated_at: string;
          emailed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          certification_assignment_id: string;
          certificate_number: string;
          verification_token?: string;
          file_url?: string | null;
          verification_url?: string | null;
          certificate_public_snapshot?: Json | null;
          status?: CertificateStatus;
          revoked_at?: string | null;
          revoked_by?: string | null;
          revoke_reason?: string | null;
          generated_at?: string;
          emailed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          certification_assignment_id?: string;
          certificate_number?: string;
          verification_token?: string;
          file_url?: string | null;
          verification_url?: string | null;
          certificate_public_snapshot?: Json | null;
          status?: CertificateStatus;
          revoked_at?: string | null;
          revoked_by?: string | null;
          revoke_reason?: string | null;
          generated_at?: string;
          emailed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      platform_settings: {
        Row: {
          id: boolean;
          active_language: Locale;
          enabled_languages: Locale[];
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          active_language?: Locale;
          enabled_languages?: Locale[];
          updated_at?: string;
        };
        Update: {
          id?: boolean;
          active_language?: Locale;
          enabled_languages?: Locale[];
          updated_at?: string;
        };
      };
      account_history: {
        Row: {
          id: string;
          participant_id: string;
          certification_assignment_id: string | null;
          event_type: string;
          event_label: string | null;
          event_data: Json | null;
          created_by_admin_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          participant_id: string;
          certification_assignment_id?: string | null;
          event_type: string;
          event_label?: string | null;
          event_data?: Json | null;
          created_by_admin_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          participant_id?: string;
          certification_assignment_id?: string | null;
          event_type?: string;
          event_label?: string | null;
          event_data?: Json | null;
          created_by_admin_id?: string | null;
          created_at?: string;
        };
      };
    }>;
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_superadmin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Convenience row aliases used throughout the app.
type Tables = Database["public"]["Tables"];
export type AdminProfile = Tables["admin_profiles"]["Row"];
export type Participant = Tables["participants"]["Row"];
export type Course = Tables["courses"]["Row"];
export type CourseTopic = Tables["course_topics"]["Row"];
export type Question = Tables["questions"]["Row"];
export type QuestionOption = Tables["question_options"]["Row"];
export type CertificateTemplate = Tables["certificate_templates"]["Row"];
export type CertificateAsset = Tables["certificate_assets"]["Row"];
export type Questionnaire = Tables["questionnaires"]["Row"];
export type QuestionnaireQuestion = Tables["questionnaire_questions"]["Row"];
export type CertificationAssignment = Tables["certification_assignments"]["Row"];
export type CertificationAssignmentTopic = Tables["certification_assignment_topics"]["Row"];
export type Attempt = Tables["attempts"]["Row"];
export type AttemptAnswer = Tables["attempt_answers"]["Row"];
export type Certificate = Tables["certificates"]["Row"];
export type AccountHistoryEvent = Tables["account_history"]["Row"];
export type PlatformSettings = Tables["platform_settings"]["Row"];
