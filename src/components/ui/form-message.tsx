import { cn } from "@/lib/utils";

type Props = {
  tone?: "error" | "success";
  children?: React.ReactNode;
  className?: string;
};

/** Inline form feedback (validation errors or success notices). Renders
 * nothing when there is no message. */
export function FormMessage({ tone = "error", children, className }: Props) {
  if (!children) return null;

  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl px-3 py-2 text-sm",
        tone === "error"
          ? "bg-red-50 text-red-700"
          : "bg-green-50 text-green-700",
        className,
      )}
    >
      {children}
    </p>
  );
}
