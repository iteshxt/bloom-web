"use client";

import { useId } from "react";
import { svgId } from "@/components/icons/Puff";
import { CSS_PALETTE, logoFragment } from "@/lib/brand/logo";

/** The Bloom flower (design §2.2), the same drawing as the app icon, in the
 *  design tokens. Decorative unless `title` is given. */
export function LogoMark({
  size = 96,
  shadow = false,
  title,
  className = "",
}: {
  size?: number;
  shadow?: boolean;
  title?: string;
  className?: string;
}) {
  const id = `lm${svgId(useId())}`;
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      // Our own constant markup from lib/brand/logo.ts, never user input.
      dangerouslySetInnerHTML={{
        __html: logoFragment({ palette: CSS_PALETTE, shadow, id }),
      }}
    />
  );
}
