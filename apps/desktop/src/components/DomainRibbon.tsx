import DomainIcon from './DomainIcon';
import './DomainRibbon.css';

interface DomainRibbonProps {
  domainName: string;
  colorHex: string | null | undefined;
  className?: string;
}

// The corebook renders each Domain as a swallow-tailed pennant in that
// Domain's own color, with a centered icon (Daggerheart Core Rulebook
// p.24) - this mirrors that shape via two clip-path layers (a slightly
// larger gold "border" layer behind a slightly inset color "fill" layer)
// rather than an SVG, so it stays a plain themeable div and the icon on
// top can keep using the same DomainIcon/currentColor approach as
// everywhere else. The gold divider bar that used to sit under the icon
// was dropped (see DomainRibbon.css) so the icon can be bigger, filling
// the space that line and its margin used to take.
export default function DomainRibbon({ domainName, colorHex, className }: DomainRibbonProps) {
  // Bone's own color is a near-white silver (#D4E4E7) — the icon's usual
  // white reads as almost invisible against it, the one Domain color this
  // happens with, so it flips to black just for Bone.
  const isBone = domainName.trim().toLowerCase() === 'bone';
  const classes = [
    'domain-ribbon',
    isBone && 'domain-ribbon--bone',
    className,
  ].filter(Boolean).join(' ');
  return (
    <div className={classes} style={{ color: colorHex ?? 'var(--fear-dim)' }}>
      <div className="domain-ribbon__border" />
      <div className="domain-ribbon__fill" />
      <DomainIcon domainName={domainName} className="domain-ribbon__icon" />
    </div>
  );
}
