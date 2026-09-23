import { toPng } from 'html-to-image';
import { apiClient } from '../api/client';

/** Slug a display name into a safe default filename, e.g. "Acid Burrower" -> "acid-burrower.png". */
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'export'
  );
}

/** Captures a DOM node (typically a .stat-sheet) as a PNG and hands it to the
 * native save dialog. Rendering at 2x devicePixelRatio keeps exported text
 * crisp regardless of the screen it was captured on. */
export async function exportNodeAsImage(node: HTMLElement, name: string): Promise<void> {
  // skipFonts: true — html-to-image otherwise tries to read .cssRules off
  // every loaded stylesheet to embed @font-face data, including the
  // cross-origin Google Fonts <link>, which throws a SecurityError the
  // browser's same-origin CSSOM restriction and hangs the export. The
  // rasterized canvas still picks up the already-loaded webfont via normal
  // computed styles, so nothing is lost visually — this only skips
  // embedding font *data* for portability to a machine without it cached.
  const dataUrl = await toPng(node, { pixelRatio: 2, skipFonts: true });
  await apiClient.saveImage(dataUrl, `${slugify(name)}.png`);
}
