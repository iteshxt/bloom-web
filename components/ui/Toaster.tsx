"use client";

import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { PuffyIcon } from "@/components/icons/puffy";
import { spring } from "@/lib/motion";
import { dismissToast, useToast } from "@/lib/toast";

// design §10.13: top-centre glass pill that drops in (bouncy), stays 2.8 s
// and can be swiped up to dismiss.

export function Toaster() {
  const t = useToast();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] flex justify-center px-4"
    >
      <AnimatePresence>
        {t && (
          <m.div
            key={t.id}
            className="glass rounded-pill pointer-events-auto flex max-w-[398px] items-center gap-2 py-1.5 pr-5 pl-2 text-sm font-semibold"
            initial={{ y: -24, opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: spring.bouncy }}
            exit={{ y: -24, opacity: 0, transition: spring.soft }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.8, bottom: 0 }}
            onDragEnd={(_, info) => info.offset.y < -20 && dismissToast()}
          >
            {t.icon ? (
              <PuffyIcon name={t.icon} size={32} />
            ) : (
              <span className="w-2" />
            )}
            <span className="line-clamp-2">{t.text}</span>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
