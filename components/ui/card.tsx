import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const padMap = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export function Card({
  className,
  interactive,
  padding = "md",
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "surface",
        padMap[padding],
        interactive && "surface-hover cursor-pointer",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 mb-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold tracking-tight text-fg">
          {title}
        </h3>
        {description ? (
          <p className="mt-1 text-[13px] text-fg-muted leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-5 flex items-center justify-between gap-3 pt-4 border-t border-border",
        className,
      )}
    >
      {children}
    </div>
  );
}
