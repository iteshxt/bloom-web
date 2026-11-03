import { PuffyIcon } from "@/components/icons/puffy";

// design §10.6: three heart-coins. Filled ones are butter puffy coins; used
// ones are dashed outlines in ink-3.

export function TokenPouch({
  tokens,
  max,
  size = 20,
  label,
}: {
  tokens: number;
  max: number;
  size?: number;
  /** Text after the coins, e.g. "tokens" (design §10.5). */
  label?: string;
}) {
  return (
    <div
      className="flex items-center gap-1"
      role="img"
      aria-label={`${tokens} of ${max} restores left`}
    >
      {Array.from({ length: max }, (_, i) =>
        i < tokens ? (
          <PuffyIcon key={i} name="coin" size={size} />
        ) : (
          <span
            key={i}
            className="border-ink-3 rounded-pill border-[1.5px] border-dashed"
            style={{
              width: size * 0.75,
              height: size * 0.75,
              margin: size * 0.125,
            }}
          />
        ),
      )}
      {label && <span className="text-ink-2 ml-1 text-[13px]">{label}</span>}
    </div>
  );
}
