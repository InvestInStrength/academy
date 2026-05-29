import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const fieldClasses =
  "block w-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:opacity-60";

export { fieldClasses };

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClasses, "rounded-full", className)} {...props} />;
}
