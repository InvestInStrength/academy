import { cn } from "@/lib/utils";

type Variant = "olive" | "white" | "black";

const logoSrc: Record<Variant, string> = {
  olive: "/brand/IIS_LOGO_olive.svg",
  white: "/brand/IIS_LOGO_white.svg",
  black: "/brand/IIS_LOGO_black.svg",
};

/** Full Invest in Strength word/image mark (portrait). Size via className,
 * e.g. `className="h-28"`. */
export function Logo({
  variant = "olive",
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoSrc[variant]}
      alt="Invest in Strength"
      className={cn("block w-auto", className)}
    />
  );
}

/** Square emblem only — for compact headers and tight spaces. */
export function Emblem({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/IIS_emblem.svg"
      alt="Invest in Strength"
      className={cn("block", className)}
    />
  );
}
