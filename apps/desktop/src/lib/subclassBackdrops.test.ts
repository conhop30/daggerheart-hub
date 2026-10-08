import { describe, expect, it } from 'vitest';
import { backdropFileFor, subclassSlug } from './subclassBackdrops';

describe('subclassSlug', () => {
  it('matches a Subclass name to its file name whatever the case, spacing or apostrophes', () => {
    expect(subclassSlug('Call of the Brave')).toBe('call-of-the-brave');
    expect(subclassSlug("Executioner's Guild")).toBe('executioners-guild');
    expect(subclassSlug('  Executioners   Guild ')).toBe('executioners-guild');
  });
});

describe('backdropFileFor', () => {
  const files = ['warden-of-the-elements.webp', 'executioners-guild.png'];

  it('finds the picture for a Subclass by name, and nothing for one without', () => {
    expect(backdropFileFor(files, 'Warden of the Elements')).toBe('warden-of-the-elements.webp');
    expect(backdropFileFor(files, "Executioner's Guild")).toBe('executioners-guild.png');
    expect(backdropFileFor(files, 'A Homebrew Subclass')).toBeUndefined();
    expect(backdropFileFor([], 'Warden of the Elements')).toBeUndefined();
  });
});
