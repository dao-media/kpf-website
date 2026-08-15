import { useId } from "react";
import GranteeCard from "@/components/GranteeCard";

/**
 * About-page grantee cards grid — equal-height cells sized for bottom photo pop-out.
 */
export default function GranteeCardsGrid({ items = [], label = "Grantee cards" }) {
  const labelId = `kpf-grantees-grid-${useId().replace(/:/g, "")}`;
  const cards = Array.isArray(items) ? items.filter((item) => item?.name) : [];

  if (cards.length < 1) return null;

  return (
    <div className="kpf-grantees__grid" aria-labelledby={labelId}>
      <p id={labelId} className="kpf-u-sr-only">
        {label}
      </p>
      {cards.map((item) => (
        <div key={item.id || item.name} className="kpf-grantees__cell">
          <GranteeCard {...item} />
        </div>
      ))}
    </div>
  );
}
