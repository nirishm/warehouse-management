import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent-color)] text-white hover:bg-[var(--accent-dark)] active:scale-[0.98]",
        destructive:
          "bg-[var(--red)] text-white hover:bg-[var(--red)]/90",
        outline:
          "border border-[var(--border-mid)] bg-[var(--bg-base)] text-[var(--text-primary)] hover:bg-[var(--bg-off)]",
        "outline-orange":
          "border border-[var(--accent-color)] text-[var(--accent-color)] bg-transparent hover:bg-[var(--accent-tint)]",
        secondary:
          "bg-[var(--bg-off)] text-[var(--text-primary)] hover:bg-[var(--bg-off)]/80",
        ghost:
          "text-[var(--text-primary)] hover:bg-[var(--bg-off)]",
        link:
          "text-[var(--accent-color)] underline-offset-4 hover:underline",
        ink:
          "bg-[var(--bg-ink)] text-white hover:bg-[var(--bg-ink)]/90",
        subtle:
          "bg-[var(--accent-tint)] text-[var(--accent-color)] hover:bg-[var(--accent-tint)]/80",
      },
      size: {
        default: "h-[var(--btn-h)] px-4 rounded-lg",
        sm: "h-[var(--btn-h-sm)] px-3 rounded-lg text-xs",
        lg: "h-[var(--btn-h-lg)] px-6 rounded-full",
        icon: "h-[var(--btn-h)] w-[var(--btn-h)] rounded-lg",
        "icon-sm": "h-[var(--btn-h-sm)] w-[var(--btn-h-sm)] rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
