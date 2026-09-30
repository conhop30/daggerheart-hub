import { domainIconUrl } from '../lib/domainIcons';
import './DomainIcon.css';

interface DomainIconProps {
  domainName: string;
  className?: string;
}

// Renders via a CSS mask, not <img>, on purpose: an <img src="*.svg"> loses
// the fill="currentColor" the 9 vector icons use (an external SVG document
// doesn't inherit page CSS), and Dread's icon is a raster silhouette with no
// vector path at all. Masking both through background-color: currentColor
// (see DomainIcon.css) gives all 10 identical, freely-recolorable behavior.
// Renders nothing for a Domain name with no matching asset (homebrew).
export default function DomainIcon({ domainName, className }: DomainIconProps) {
  const url = domainIconUrl(domainName);
  if (!url) return null;
  const classes = className ? `domain-icon ${className}` : 'domain-icon';
  return (
    <span
      className={classes}
      style={{ WebkitMaskImage: `url(${url})`, maskImage: `url(${url})` }}
      aria-hidden="true"
    />
  );
}
