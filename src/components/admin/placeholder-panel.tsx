import { Card, CardContent } from "@/components/ui/card";

export function PlaceholderPanel({ note }: { note: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center">
        <p className="text-sm text-slate-500">{note}</p>
      </CardContent>
    </Card>
  );
}
