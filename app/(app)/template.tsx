"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { spring } from "@/lib/motion";
import { useHydrated } from "@/lib/useHydrated";

// Tab switch (design §12.3): the content crossfades with a 12 px slide in
// the direction of travel, while the nav pill glides. Screens that aren't
// tabs count as the tab they belong to. The first page load doesn't move.

let lastIndex = 0;

function tabIndex(path: string): number {
  if (path.startsWith("/milestones")) return 1;
  if (path.startsWith("/gifts")) return 2;
  if (path.startsWith("/player") || path.startsWith("/settings")) return 3;
  return 0;
}

export default function AppTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  // A template mounts fresh on every navigation, so this runs once per
  // screen; reading the URL directly keeps it out of prerendering.
  const hydrated = useHydrated();
  const [direction] = useState(() =>
    hydrated ? Math.sign(tabIndex(window.location.pathname) - lastIndex) : 0,
  );
  useEffect(() => {
    lastIndex = tabIndex(window.location.pathname);
  }, []);

  return (
    <motion.div
      className="flex flex-1 flex-col"
      initial={hydrated ? { opacity: 0, x: direction * 12 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...spring.soft, opacity: { duration: 0.2 } }}
    >
      {children}
    </motion.div>
  );
}
