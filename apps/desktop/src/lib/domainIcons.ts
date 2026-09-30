import arcana from '../assets/domains/arcana.svg';
import blade from '../assets/domains/blade.svg';
import bone from '../assets/domains/bone.svg';
import codex from '../assets/domains/codex.svg';
import dread from '../assets/domains/dread-mask.png';
import grace from '../assets/domains/grace.svg';
import midnight from '../assets/domains/midnight.svg';
import sage from '../assets/domains/sage.svg';
import splendor from '../assets/domains/splendor.svg';
import valor from '../assets/domains/valor.svg';

// Name-keyed, not id-keyed or schema-backed: Domain.iconPath exists in the
// store but every seed Domain leaves it null, and homebrew Domains are
// created by name through the ordinary "+ Create Domain" form with no icon
// picker. Keying off the (lowercased) name means a new built-in-named
// Domain — including "Dread" once someone creates it — picks up its icon
// for free, with no backend change.
const DOMAIN_ICONS: Record<string, string> = {
  arcana,
  blade,
  bone,
  codex,
  dread,
  grace,
  midnight,
  sage,
  splendor,
  valor,
};

export function domainIconUrl(domainName: string): string | undefined {
  return DOMAIN_ICONS[domainName.trim().toLowerCase()];
}
