import * as React from "react";
import { cn } from "@/lib/utils";

interface FormSectionProps {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({
  label,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-col gap-0.5">
        <span className="text-[12px] font-bold uppercase tracking-[0.06em] text-[var(--text-dim)]">
          {label}
        </span>
        {description && (
          <span className="text-[13px] text-[var(--text-muted)]">
            {description}
          </span>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}
