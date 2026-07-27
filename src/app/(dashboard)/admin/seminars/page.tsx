import { ContentListPage } from "../courses/content-list-page";

/**
 * Seminars are `courses` rows with `kind = 'seminar'` — a single event that is
 * certified with a questionnaire exactly like a course. The whole screen is
 * shared with /admin/courses; see `../courses/content-list-page.tsx`.
 */
export default async function SeminarsPage() {
  return <ContentListPage kind="seminar" />;
}
