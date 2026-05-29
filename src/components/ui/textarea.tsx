import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";
import { fieldClasses } from "@/components/ui/input";

export function Textarea({
  className,
  rows = 3,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} className={cn(fieldClasses, className)} {...props} />;
}
