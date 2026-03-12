"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[var(--bg-base)] group-[.toaster]:text-[var(--text-primary)] group-[.toaster]:border group-[.toaster]:border-[var(--border)] group-[.toaster]:shadow-lg group-[.toaster]:rounded-[var(--card-radius)]",
          description: "group-[.toast]:text-[var(--text-muted)] text-[13px]",
          actionButton:
            "group-[.toast]:bg-[var(--accent-color)] group-[.toast]:text-white group-[.toast]:font-bold",
          cancelButton:
            "group-[.toast]:bg-[var(--bg-off)] group-[.toast]:text-[var(--text-muted)]",
          success:
            "group-[.toaster]:text-[var(--green)] group-[.toaster]:border-[var(--green-bg)]",
          error:
            "group-[.toaster]:text-[var(--red)] group-[.toaster]:border-[var(--red-bg)]",
          warning:
            "group-[.toaster]:text-[var(--color-warning)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
