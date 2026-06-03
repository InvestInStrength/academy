import { getDictionary, t as rawT } from "@/lib/i18n/dict";
import type { AccountHistoryEvent, Locale } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  events: AccountHistoryEvent[];
  adminEmailById: Map<string, string>;
  locale: Locale;
};

function formatDateTime(iso: string, locale: Locale): string {
  const bcp = locale === "de" ? "de-DE" : "en-GB";
  return new Date(iso).toLocaleString(bcp, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistorySection({ events, adminEmailById, locale }: Props) {
  const dict = getDictionary(locale);
  const t = (key: string, params?: Record<string, string | number>) =>
    rawT(dict, key, params);

  /** Localize from the event_type discriminator (dict-driven), falling back to
   * the stored English event_label — which is never rewritten (append-only
   * audit). attempt_submitted carries its number in event_data. */
  function eventLabel(event: AccountHistoryEvent): string {
    const key = `history.event.${event.event_type}`;
    if (!(key in dict)) return event.event_label ?? event.event_type;
    const number = (event.event_data as { attempt_number?: number } | null)
      ?.attempt_number;
    return t(key, number != null ? { number } : undefined);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("admin.history.title", { count: events.length })}</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">
            {t("admin.history.empty")}
          </p>
        ) : (
          <ol className="space-y-3">
            {events.map((event) => (
              <li key={event.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
                <div>
                  <p className="font-medium text-slate-800">
                    {eventLabel(event)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatDateTime(event.created_at, locale)}
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
