import { useLayoutEffect, useRef } from 'react';
import type { Card, CardType } from '../api/cards';
import { domainGradient } from './DomainBanner';
import { titleCaseEnum } from '../lib/format';
import './DomainCardTile.css';

// A real printed card never scrolls — whoever wrote a wordier one just had
// it set in smaller type. This mirrors that: starts the rules text at its
// normal size and steps it down until it fits the card's fixed rules area,
// instead of the area scrolling to reveal the rest. Driven by an actual
// DOM measurement (scrollHeight vs. the container's fixed clientHeight),
// not a character-count heuristic — the card's real pixel width depends on
// the gallery grid's column width, which isn't knowable from the text
// alone, and the same description can need a different size on a wide
// screen vs. a narrow one. A ResizeObserver re-fits on window/card resize
// (e.g. the app's own window-size Settings presets), not just on mount.
const MAX_RULES_FONT_REM = 0.66;
const MIN_RULES_FONT_REM = 0.46;
const RULES_FONT_STEP_REM = 0.02;

function useFitRulesText(text: string | null | undefined) {
  const ref = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const container = el?.parentElement;
    if (!el || !container) return;

    function fit() {
      let size = MAX_RULES_FONT_REM;
      el!.style.fontSize = `${size}rem`;
      while (container!.scrollHeight > container!.clientHeight && size > MIN_RULES_FONT_REM) {
        size = Math.max(MIN_RULES_FONT_REM, size - RULES_FONT_STEP_REM);
        el!.style.fontSize = `${size}rem`;
      }
    }

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    return () => observer.disconnect();
  }, [text]);
  return ref;
}

interface DomainCardTileProps {
  card: Card;
  domainName: string;
  domainColor: string | null | undefined;
  onEdit: () => void;
  onDelete: () => void;
}

// A physical Domain Card is a 2.5in x 3.5in poker card with the illustration
// filling roughly the top half and the rules text filling the bottom half —
// this mirrors that proportion (via CSS grid rows on a fixed-aspect-ratio
// tile) instead of the generic ContentCard's plain stacked layout, so the
// gallery reads like an actual deck rather than a spreadsheet.
export default function DomainCardTile({ card, domainName, domainColor, onEdit, onDelete }: DomainCardTileProps) {
  const rulesRef = useFitRulesText(card.description);
  return (
    <div className="domain-card-tile">
      <div className="domain-card-tile__actions">
        <button type="button" className="domain-card-tile__action" onClick={onEdit}>
          Edit
        </button>
        <button type="button" className="domain-card-tile__action domain-card-tile__action--danger" onClick={onDelete}>
          Delete
        </button>
      </div>

      <div className="domain-card-tile__art" style={{ background: domainGradient(domainColor) }}>
        {card.imagePath ? (
          <img className="domain-card-tile__art-image" src={card.imagePath} alt="" />
        ) : (
          <TypeGlyph type={card.type} />
        )}
        {card.level != null && <span className="domain-card-tile__level">{card.level}</span>}
      </div>

      <div className="domain-card-tile__plate">
        <h4 className="domain-card-tile__name">{card.name}</h4>
        <div className="domain-card-tile__caption">
          <span className="domain-card-tile__domain">{domainName}</span>
          <span className="domain-card-tile__type">{titleCaseEnum(card.type)}</span>
          {card.recallCost != null && <span className="domain-card-tile__recall">Recall {card.recallCost}</span>}
        </div>
      </div>

      <div className="domain-card-tile__rules">{card.description && <p ref={rulesRef}>{card.description}</p>}</div>
    </div>
  );
}

function TypeGlyph({ type }: { type: CardType }) {
  switch (type) {
    case 'SPELL':
      return (
        <svg className="domain-card-tile__glyph" viewBox="0 0 48 48" aria-hidden="true">
          <path d="M24 4 L28 20 L44 24 L28 28 L24 44 L20 28 L4 24 L20 20 Z" fill="currentColor" />
        </svg>
      );
    case 'GRIMOIRE':
      return (
        <svg className="domain-card-tile__glyph" viewBox="0 0 48 48" aria-hidden="true">
          <path
            d="M6 12 C14 8 20 8 24 12 C28 8 34 8 42 12 V38 C34 34 28 34 24 38 C20 34 14 34 6 38 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          />
          <line x1="24" y1="12" x2="24" y2="38" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case 'ABILITY':
    default:
      return (
        <svg className="domain-card-tile__glyph" viewBox="0 0 48 48" aria-hidden="true">
          <polygon points="24,4 42,14 42,34 24,44 6,34 6,14" fill="none" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      );
  }
}
