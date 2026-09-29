// Rasterizes build/icon.svg into the PNG/ICO files electron-builder and the
// dev-mode BrowserWindow need. No image library is installed in this repo
// (no Pillow/ImageMagick/Inkscape either), so this reuses Playwright's
// already-installed headless Chromium as the SVG rasterizer, and hand-packs
// the resulting PNGs into a Windows .ico — modern ICOs can embed PNG-format
// frames directly (supported since Vista), so no separate BMP encoder is
// needed.
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(import.meta.dirname, '..');
const SVG_PATH = path.join(ROOT, 'build', 'icon.svg');
const ICO_SIZES = [16, 24, 32, 48, 64, 128, 256];
const PNG_SIZES = [512, 256, 128, 64, 48, 32, 16];

async function rasterize(svg, size) {
  const browser = rasterize.browser ?? (rasterize.browser = await chromium.launch());
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<!doctype html><html><body style="margin:0"><div id="c" style="width:${size}px;height:${size}px">${svg}</div></body></html>`
  );
  const buffer = await (await page.$('#c')).screenshot({ omitBackground: true });
  await page.close();
  return buffer;
}

// Minimal ICO container: a 6-byte header, one 16-byte directory entry per
// image, then the raw PNG bytes back to back (the "PNG-in-ICO" format).
function packIco(pngsBySize) {
  const sizes = ICO_SIZES.filter((s) => pngsBySize.has(s));
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(sizes.length, 4);

  const dir = Buffer.alloc(16 * sizes.length);
  const chunks = [header, dir];
  let offset = 6 + 16 * sizes.length;

  sizes.forEach((size, i) => {
    const png = pngsBySize.get(size);
    const entry = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, entry + 0); // width (0 = 256)
    dir.writeUInt8(size >= 256 ? 0 : size, entry + 1); // height (0 = 256)
    dir.writeUInt8(0, entry + 2); // palette
    dir.writeUInt8(0, entry + 3); // reserved
    dir.writeUInt16LE(1, entry + 4); // color planes
    dir.writeUInt16LE(32, entry + 6); // bits per pixel
    dir.writeUInt32LE(png.length, entry + 8); // data size
    dir.writeUInt32LE(offset, entry + 12); // data offset
    offset += png.length;
    chunks.push(png);
  });

  return Buffer.concat(chunks);
}

const svg = fs.readFileSync(SVG_PATH, 'utf8');
const pngsBySize = new Map();
for (const size of new Set([...ICO_SIZES, ...PNG_SIZES])) {
  pngsBySize.set(size, await rasterize(svg, size));
  console.log(`rendered ${size}x${size}`);
}
if (rasterize.browser) await rasterize.browser.close();

for (const size of PNG_SIZES) {
  fs.writeFileSync(path.join(ROOT, 'build', `icon-${size}.png`), pngsBySize.get(size));
}
// electron-builder's linux/general "icon" field and the dev-mode
// BrowserWindow icon both just want one representative PNG.
fs.copyFileSync(path.join(ROOT, 'build', 'icon-512.png'), path.join(ROOT, 'build', 'icon.png'));

fs.writeFileSync(path.join(ROOT, 'build', 'icon.ico'), packIco(pngsBySize));
console.log('wrote build/icon.ico and build/icon.png (+ per-size PNGs)');
