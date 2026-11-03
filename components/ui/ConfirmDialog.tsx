"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { dur, spring } from "@/lib/motion";
import { Button } from "./Button";

// design §10.9: small centred card, only for irreversible actions
// (rejecting a restore, changing the start date).

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Go back",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <m.div
            className="bg-ink/20 absolute inset-0 backdrop-blur-[6px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.fast }}
            onClick={onCancel}
          />
          <m.section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={id}
            className="bg-surface shadow-float relative flex w-full max-w-[340px] flex-col gap-3 rounded-xl p-6"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={spring.bouncy}
          >
            <h2
              id={id}
              className="font-display text-[22px] leading-[1.2] font-bold"
            >
              {title}
            </h2>
            {body && <p className="text-ink-2">{body}</p>}
            <div className="mt-2 flex flex-col gap-2">
              <Button
                variant="soft"
                tone="peach"
                className="h-[52px]!"
                disabled={busy}
                onClick={onConfirm}
              >
                {confirmLabel}
              </Button>
              <Button variant="ghost" onClick={onCancel} autoFocus>
                {cancelLabel}
              </Button>
            </div>
          </m.section>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
