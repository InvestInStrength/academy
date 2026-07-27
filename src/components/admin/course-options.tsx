"use client";

import type { CourseKind } from "@/types/database";
import { useT } from "@/lib/i18n/client";

export type CourseOption = { id: string; title: string; kind: CourseKind };

/**
 * `<option>`s for a course/seminar picker, grouped by kind. Questions and tests
 * hang off a `courses` row that may be either a multi-module course or a
 * single-event seminar, and the two lists are managed in separate admin
 * sections — so a flat alphabetical list would silently mix them.
 *
 * Renders a plain (ungrouped) list when only one kind exists, so a platform with
 * no seminars looks exactly as it did before.
 */
export function CourseOptions({ courses }: { courses: CourseOption[] }) {
  const t = useT();
  const seminars = courses.filter((c) => c.kind === "seminar");
  const plain = courses.filter((c) => c.kind !== "seminar");

  if (seminars.length === 0 || plain.length === 0) {
    return (
      <>
        {courses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.title}
          </option>
        ))}
      </>
    );
  }

  return (
    <>
      <optgroup label={t("nav.courses")}>
        {plain.map((course) => (
          <option key={course.id} value={course.id}>
            {course.title}
          </option>
        ))}
      </optgroup>
      <optgroup label={t("nav.seminars")}>
        {seminars.map((course) => (
          <option key={course.id} value={course.id}>
            {course.title}
          </option>
        ))}
      </optgroup>
    </>
  );
}
