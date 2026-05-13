"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/icons";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  /** Block backdrop dismiss while the body is saving. */
  busy?: boolean;
}

const ANIM_MS = 200;

const sizeMap = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-2xl",
};

// Enter and exit are mirror images (per the project's animation-symmetry rule):
// enter: opacity 0 + translateY(8px) + scale(0.98) -> opacity 1 + translateY(0) + scale(1)
// exit:  the reverse, on the same curve and duration.
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  busy,
}: ModalProps) {
  const [mounted, setMounted] = useState(open);
  const [leaving, setLeaving] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      setMounted(true);
      setLeaving(false);
    } else if (mounted) {
      setLeaving(true);
      closeTimer.current = setTimeout(() => {
        setMounted(false);
        setLeaving(false);
      }, ANIM_MS);
    }
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, [open, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKey);
    // Lock body scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mounted, onClose, busy]);

  if (!mounted) return null;

  const animating = leaving ? "modal-leave" : "modal-enter";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-busy={busy ? true : undefined}
      className="fixed inset-0 z-50"
    >
      <div
        className={cn(
          "absolute inset-0 bg-black/40 backdrop-blur-[2px]",
          leaving ? "backdrop-leave" : "backdrop-enter",
        )}
        onClick={() => !busy && onClose()}
      />
      <div className="absolute inset-0 grid place-items-center px-4 py-8 overflow-y-auto">
        <div
          className={cn(
            "relative w-full surface shadow-pop p-0 overflow-hidden",
            sizeMap[size],
            animating,
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {(title || description) && (
            <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-border">
              <div className="min-w-0">
                {title ? (
                  <h2 className="text-[16px] font-semibold tracking-tight text-fg">
                    {title}
                  </h2>
                ) : null}
                {description ? (
                  <p className="mt-1 text-[12.5px] text-fg-muted leading-relaxed">
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => !busy && onClose()}
                className="shrink-0 grid h-7 w-7 place-items-center rounded-full text-fg-subtle hover:bg-panel-hover hover:text-fg transition-colors"
              >
                <Icon.x width={14} height={14} />
              </button>
            </header>
          )}
          <div className="px-6 py-5">{children}</div>
          {footer ? (
            <footer className="px-6 py-4 border-t border-border bg-bg flex items-center justify-end gap-2">
              {footer}
            </footer>
          ) : null}
        </div>
      </div>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes modalOut {
          from { opacity: 1; transform: translateY(0)   scale(1); }
          to   { opacity: 0; transform: translateY(8px) scale(0.98); }
        }
        @keyframes backdropIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes backdropOut { from { opacity: 1 } to { opacity: 0 } }
        .modal-enter   { animation: modalIn    ${ANIM_MS}ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .modal-leave   { animation: modalOut   ${ANIM_MS}ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        .backdrop-enter{ animation: backdropIn ${ANIM_MS}ms ease both; }
        .backdrop-leave{ animation: backdropOut ${ANIM_MS}ms ease both; }
      `}</style>
    </div>
  );
}
