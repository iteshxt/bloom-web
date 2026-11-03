"use client";

import {
  AnimatePresence,
  motion,
  useDragControls,
  type PanInfo,
} from "motion/react";
import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { dur, spring } from "@/lib/motion";
import { playSound } from "@/lib/sound";

// Bottom sheet (design §10.9): r-xl top corners, a grab handle, a dimmed and
// blurred backdrop. Opens with the floaty spring; drag down to dismiss
// (velocity over 500 px/s or 30% of its height).

export function Sheet({
  open,
  onClose,
  title,
  children,
  color,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Player colour for focus rings and primary buttons inside. */
  color?: string;
}) {
  const titleId = useId();
  const drag = useDragControls();

  useEffect(() => {
    if (!open) return;
    playSound("whoosh");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  function onDragEnd(_: unknown, info: PanInfo, height: number) {
    if (info.velocity.y > 500 || info.offset.y > height * 0.3) onClose();
  }

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <motion.div
            className="bg-ink/20 absolute inset-0 backdrop-blur-[6px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: dur.fast }}
            onClick={onClose}
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-player-color={color}
            className="bg-surface relative flex max-h-[88dvh] w-full max-w-[430px] flex-col rounded-t-xl pb-[max(1.5rem,env(safe-area-inset-bottom))]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={spring.floaty}
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.9 }}
            onDragEnd={(e, info) =>
              onDragEnd(
                e,
                info,
                (e.target as HTMLElement).closest("section")?.offsetHeight ??
                  400,
              )
            }
          >
            <div
              className="flex h-8 shrink-0 cursor-grab touch-none items-center justify-center"
              onPointerDown={(e) => drag.start(e)}
            >
              <span className="bg-ink-3 rounded-pill h-[5px] w-9" />
            </div>
            <h2
              id={titleId}
              className="font-display px-5 pb-3 text-[22px] leading-[1.2] font-bold"
            >
              {title}
            </h2>
            <div className="flex flex-col gap-4 overflow-y-auto px-5">
              {children}
            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
