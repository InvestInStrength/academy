import type { AccountHistoryEvent } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  events: AccountHistoryEvent[];
  adminEmailById: Map<string, string>;
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistorySection({ events, adminEmailById }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account history ({events.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">
            No events recorded yet.
          </p>
        ) : (
          <ol className="space-y-3">
            {events.map((event) => (
              <li key={event.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                <div>
                  <p className="font-medium text-slate-800">
                    {event.event_label ?? event.event_type}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDateTime(event.created_at)}
                    {event.created_by_admin_id &&
                      ` · ${adminEmailById.get(event.created_by_admin_id) ?? "admin"}`}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
