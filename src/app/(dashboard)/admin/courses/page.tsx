import Link from "next/link";

import { requireAdmin } from "@/lib/auth/admin";
import { formatDate } from "@/lib/utils";
import type { Course } from "@/types/database";
import { PageHeader } from "@/components/admin/page-header";
import { ActionButton } from "@/components/admin/action-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseForm } from "./course-form";
import { toggleCourseActive } from "./actions";

export default async function CoursesPage() {
  const { supabase } = await requireAdmin();

  const { data } = await supabase
    .from("courses")
    .select("*")
    .order("created_at", { ascending: false });

  const courses: Course[] = data ?? [];

  return (
    <div>
      <PageHeader
        title="Courses"
        description="Top-level courses. Topics and questions live inside each course."
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>All courses ({courses.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {courses.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                No courses yet. Create your first course on the right.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-2 font-medium">Title</th>
                    <th className="px-5 py-2 font-medium">Status</th>
                    <th className="px-5 py-2 font-medium">Created</th>
                    <th className="px-5 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => (
                    <tr
                      key={course.id}
                      className="border-b border-slate-50 last:border-0"
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/courses/${course.id}`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          {course.title}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={course.active ? "success" : "neutral"}>
                          {course.active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-slate-500">
                        {formatDate(course.created_at)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <ActionButton
                            action={toggleCourseActive}
                            hidden={{ id: course.id, active: String(!course.active) }}
                          >
                            {course.active ? "Deactivate" : "Activate"}
                          </ActionButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Create a course</CardTitle>
          </CardHeader>
          <CardContent>
            <CourseForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
