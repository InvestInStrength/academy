import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";
import { fieldClasses } from "@/components/ui/input";

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(fieldClasses, "pr-8", className)} {...props}>
      {children}
    </select>
  );
}
