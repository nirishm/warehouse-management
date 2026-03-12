import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 font-bold uppercase whitespace-nowrap",
  {
    variants: {
      variant: {
        // Status badges (pill shape)
        received:
          "bg-[var(--green-bg)] text-[var(--green)] rounded-full text-[9.5px] px-2.5 py-0.5",
        dispatched:
          "bg-[var(--orange-bg)] text-[var(--accent-color)] rounded-full text-[9.5px] px-2.5 py-0.5",
        confirmed:
          "bg-[var(--blue-bg)] text-[var(--blue)] rounded-full text-[9.5px] px-2.5 py-0.5",
        cancelled:
          "bg-[var(--red-bg)] text-[var(--red)] rounded-full text-[9.5px] px-2.5 py-0.5",
        pending:
          "bg-[var(--bg-off)] text-[var(--text-muted)] rounded-full text-[9.5px] px-2.5 py-0.5",
        draft:
          "bg-[var(--bg-off)] text-[var(--text-muted)] rounded-full text-[9.5px] px-2.5 py-0.5",
        ordered:
          "bg-[var(--blue-bg)] text-[var(--blue)] rounded-full text-[9.5px] px-2.5 py-0.5",
        in_transit:
          "bg-[var(--orange-bg)] text-[var(--accent-color)] rounded-full text-[9.5px] px-2.5 py-0.5",
        approved:
          "bg-[var(--green-bg)] text-[var(--green)] rounded-full text-[9.5px] px-2.5 py-0.5",
        active:
          "bg-[var(--green-bg)] text-[var(--green)] rounded-full text-[9.5px] px-2.5 py-0.5",
        // Type labels (rectangular)
        "type-dispatch":
          "bg-[var(--orange-bg)] text-[var(--accent-color)] rounded text-[9.5px] px-2 py-0.5",
        "type-purchase":
          "bg-[var(--blue-bg)] text-[var(--blue)] rounded text-[9.5px] px-2 py-0.5",
        "type-sale":
          "bg-[var(--green-bg)] text-[var(--green)] rounded text-[9.5px] px-2 py-0.5",
        "type-shortage":
          "bg-[var(--orange-bg)] text-[var(--accent-color)] rounded-[3px] text-[8.5px] px-[5px] py-[2px]",
        // Generic
        default:
          "bg-[var(--bg-off)] text-[var(--text-muted)] rounded-full text-[9.5px] px-2.5 py-0.5",
        outline:
          "border border-[var(--border-mid)] text-[var(--text-muted)] rounded-full text-[9.5px] px-2.5 py-0.5",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, children, ...props }: BadgeProps) {
  const isStatusBadge =
    variant &&
    !String(variant).startsWith("type-") &&
    variant !== "default" &&
    variant !== "outline";

  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {isStatusBadge && (
        <span className="inline-block w-[5px] h-[5px] rounded-full bg-current" />
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
