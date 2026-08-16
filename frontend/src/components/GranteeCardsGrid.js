import { useId, useState } from "react";
import GranteeCard from "@/components/GranteeCard";

/**
 * About-page grantee cards grid — equal-height cells sized for bottom photo pop-out.
 * Owns exclusive flip state so mobile: tap flips, tap again reverts, another card closes prior.
 */
export default function GranteeCardsGrid({ items = [], label = "Grantee cards" }) {
  const labelId = `kpf-grantees-grid-${useId().replace(/:/g, "")}`;
  const cards = Array.isArray(items) ? items.filter((item) => item?.name) : [];
  const [flippedKey, setFlippedKey] = useState(null);

  if (cards.length < 1) return null;

  return (
    <div className="kpf-grantees__grid" aria-labelledby={labelId}>
      <p id={labelId} className="kpf-u-sr-only">
        {label}
      </p>
      {cards.map((item, index) => {
        const key = String(item.id || item.name || index);
        return (
          <div key={key} className="kpf-grantees__cell">
            <GranteeCard
              {...item}
              flipped={flippedKey === key}
              onFlipChange={(next) => setFlippedKey(next ? key : null)}
            />
          </div>
        );
      })}
    </div>
  );
}
