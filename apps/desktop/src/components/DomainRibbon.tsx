import DomainIcon from './DomainIcon';
import './DomainRibbon.css';

interface DomainRibbonProps {
  domainName: string;
  colorHex: string | null | undefined;
  className?: string;
}

// The corebook renders each Domain as a swallow-tailed pennant in that
// Domain's own color, with a centered icon and a thin gold divider beneath
// it (Daggerheart Core Rulebook p.24) - this mirrors that shape via two
// clip-path layers (a slightly larger gold "border" layer behind a slightly
// inset color "fill" layer) rather than an SVG, so it stays a plain themeable
// div and the icon on top can keep using the same DomainIcon/currentColor
// approach as everywhere else.
export default function DomainRibbon({ domainName, colorHex, className }: DomainRibbonProps) {
  const classes = className ? `domain-ribbon ${className}` : 'domain-ribbon';
  return (
    <div className={classes} style={{ color: colorHex ?? 'var(--fear-dim)' }}>
      <div className="domain-ribbon__border" />
      <div className="domain-ribbon__fill" />
      <DomainIcon domainName={domainName} className="domain-ribbon__icon" />
      <div className="domain-ribbon__divider" />
    </div>
  );
}
