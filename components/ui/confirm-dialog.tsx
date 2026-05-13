"use client";

import { useState, type ReactNode } from "react";
import { Modal } from "./modal";
import { Button } from "./button";
import { Icon } from "@/components/icons";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "warn" | "neutral";
}

const toneIcon = {
  danger: "text-danger bg-[color-mix(in_oklab,var(--danger)_18%,transparent)]",
  warn: "text-warn bg-[color-mix(in_oklab,var(--warn)_18%,transparent)]",
  neutral: "text-fg-muted bg-panel-hover",
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => (busy ? undefined : onClose())}
      size="sm"
      busy={busy}
    >
      <div className="flex items-start gap-4">
        <span
          className={`grid h-10 w-10 place-items-center rounded-full shrink-0 ${toneIcon[tone]}`}
        >
          <Icon.warning width={18} height={18} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold tracking-tight text-fg">
            {title}
          </h2>
          {description ? (
            <p className="mt-1.5 text-[13px] text-fg-muted leading-relaxed">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          {cancelLabel}
        </Button>
        <Button
          variant={tone === "danger" ? "danger" : "primary"}
          onClick={handleConfirm}
          loading={busy}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
