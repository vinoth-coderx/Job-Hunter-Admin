import { cn } from "@/lib/cn";

type Tone = "success" | "warn" | "danger" | "muted";

const toneClass: Record<Tone, string> = {
  success: "text-success",
  warn: "text-warn",
  danger: "text-danger",
  muted: "text-fg-subtle",
};

export function StatusDot({
  tone,
  pulse,
  size = "sm",
  className,
  title,
}: {
  tone: Tone;
  pulse?: boolean;
  size?: "xs" | "sm" | "md";
  className?: string;
  title?: string;
}) {
  const dim =
    size === "xs"
      ? "h-1.5 w-1.5"
      : size === "md"
        ? "h-2.5 w-2.5"
        : "h-2 w-2";
  return (
    <span
      title={title}
      className={cn(
        "relative inline-block rounded-full bg-current shrink-0",
        toneClass[tone],
        dim,
        pulse && "pulse-dot",
        className,
      )}
      aria-hidden
    />
  );
}
