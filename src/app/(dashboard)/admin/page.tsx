import { requireAdmin } from "@/lib/auth/admin";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

async function countRows(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  table: "courses" | "questions" | "questionnaires" | "participants",
): Promise<number> {
  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdmin();

  const [courses, questions, questionnaires, participants] = await Promise.all([
    countRows(supabase, "courses"),
    countRows(supabase, "questions"),
    countRows(supabase, "questionnaires"),
    countRows(supabase, "participants"),
  ]);

  const stats = [
    { label: "Courses", value: courses, href: "/admin/courses" },
    { label: "Questions", value: questions, href: "/admin/questions" },
    { label: "Questionnaires", value: questionnaires, href: "/admin/questionnaires" },
    { label: "Participants", value: participants, href: "/admin/participants" },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your certification content."
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent>
              <p className="text-sm text-slate-500">{stat.label}</p>
              <p className="mt-1 text-3xl font-bold text-slate-900">
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardContent className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-700">
            Get started:
          </span>
          <ButtonLink href="/admin/courses" size="sm" variant="outline">
            Manage courses
          </ButtonLink>
          <ButtonLink href="/admin/questions" size="sm" variant="outline">
            Build the question bank
          </ButtonLink>
          <ButtonLink href="/admin/questionnaires" size="sm" variant="outline">
            Create a questionnaire
          </ButtonLink>
        </CardContent>
      </Card>
    </div>
  );
}
