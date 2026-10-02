import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

// A tiny hand-rolled PNG encoder, same technique as the manual verification
// scripts used earlier for this feature — no external fixture files, no
// image-library dependency, just enough bytes to be a real, loadable image
// (uncompressed-filter scanlines through zlib.deflateSync). Flat color is
// fine here (unlike those manual scripts, which needed a checkerboard to
// show blur/feathering in a screenshot) — these tests only check that an
// upload round-trips and that orientation is read correctly, not how it looks.
function writePng(filePath: string, width: number, height: number, [r, g, b]: [number, number, number]) {
  function chunk(type: string, data: Buffer) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(zlib.crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  const raw = Buffer.alloc((width * 3 + 1) * height);
  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0; // filter type: none
    for (let x = 0; x < width; x++) {
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
    }
  }
  const idat = zlib.deflateSync(raw);
  fs.writeFileSync(
    filePath,
    Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
  );
}

test.describe('Campaigns & Party', () => {
  let tempDir: string;
  let imageDir: string;
  let app: ElectronApplication;
  let win: Page;

  test.beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daggerheart-e2e-campaigns-'));
    imageDir = path.join(tempDir, 'source-images');
    fs.mkdirSync(imageDir);
    writePng(path.join(imageDir, 'square.png'), 40, 40, [138, 103, 214]);
    writePng(path.join(imageDir, 'portrait.png'), 60, 120, [138, 103, 214]);
    writePng(path.join(imageDir, 'landscape.png'), 120, 60, [228, 179, 65]);

    const env: Record<string, string> = Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined)
    );
    env.DAGGERHEART_STORE_DIR = tempDir;
    delete env.ELECTRON_RUN_AS_NODE;
    app = await electron.launch({ args: [path.resolve('.')], env });
    win = await app.firstWindow();
    win.on('dialog', (dialog) => dialog.accept());
    await win.waitForSelector('text=Daggerheart Brewery', { timeout: 15000 });
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
  });

  test.afterEach(async () => {
    await app.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('create -> view -> edit -> delete round trip for a Campaign', async () => {
    await win.click('.campaign-row--hollow');
    await win.fill('.create-form input[type="text"]', 'E2E Campaign');
    await win.click('button:has-text("Create Campaign")');

    const banner = win.locator('.campaign-row:not(.campaign-row--hollow)', { hasText: 'E2E Campaign' });
    await expect(banner).toBeVisible();

    // Edit/Delete live on CampaignDetail now, not the gallery row itself —
    // the row's whole job is opening it (see CampaignBanner.tsx).
    await banner.click();
    await win.getByRole('button', { name: 'Edit Campaign' }).click();
    await win.fill('.create-form input[type="text"]', 'E2E Campaign Renamed');
    await win.click('button:has-text("Save Changes")');
    await expect(win.locator('.campaign-detail__title')).toHaveText('E2E Campaign Renamed');

    await win.click('.campaign-detail__back');
    const renamed = win.locator('.campaign-row:not(.campaign-row--hollow)', { hasText: 'E2E Campaign Renamed' });
    await expect(renamed).toBeVisible();

    await renamed.click();
    await win.getByRole('button', { name: 'Delete Campaign' }).click();
    await expect(win.locator('.campaign-row', { hasText: 'E2E Campaign Renamed' })).toHaveCount(0);
  });

  test('open a Campaign, add a Party member with a trackable, adjust it, then edit and delete the member', async () => {
    await win.click('.campaign-row--hollow');
    await win.fill('.create-form input[type="text"]', 'The Wildwood');
    await win.click('button:has-text("Create Campaign")');
    await win.locator('.campaign-row', { hasText: 'The Wildwood' }).click();
    await expect(win.locator('.campaign-detail__title')).toHaveText('The Wildwood');

    await win.click('.party-roster__add');
    await win.fill('.create-form input[type="text"]', 'Fenn');
    await win.click('.trackable-editor__chip:has-text("HP")');
    await win.click('button:has-text("Add Party Member")');

    const card = win.locator('.content-card', { hasText: 'Fenn' });
    await expect(card).toBeVisible();
    await expect(card.locator('.stat-stepper__value')).toHaveText('6 / 6');

    await card.getByRole('button', { name: 'Decrease HP' }).click();
    await expect(card.locator('.stat-stepper__value')).toHaveText('5 / 6');
    // Reload to confirm the optimistic update actually persisted, not just local state.
    await win.reload();
    await win.waitForSelector('text=Daggerheart Brewery', { timeout: 15000 });
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    await win.locator('.campaign-row', { hasText: 'The Wildwood' }).click();
    await expect(win.locator('.content-card', { hasText: 'Fenn' }).locator('.stat-stepper__value')).toHaveText('5 / 6');

    const reloadedCard = win.locator('.content-card', { hasText: 'Fenn' });
    await reloadedCard.getByRole('button', { name: 'Edit' }).click();
    await win.fill('.create-form input[type="text"]', 'Fenn Renamed');
    await win.click('button:has-text("Save Changes")');
    await expect(win.locator('.content-card', { hasText: 'Fenn Renamed' })).toBeVisible();

    await win.locator('.content-card', { hasText: 'Fenn Renamed' }).getByRole('button', { name: 'Delete' }).click();
    await expect(win.locator('.content-card', { hasText: 'Fenn Renamed' })).toHaveCount(0);
  });

  test('deleting a Campaign cascades to remove its Party members', async () => {
    await win.click('.campaign-row--hollow');
    await win.fill('.create-form input[type="text"]', 'Doomed Campaign');
    await win.click('button:has-text("Create Campaign")');
    await win.locator('.campaign-row', { hasText: 'Doomed Campaign' }).click();

    await win.click('.party-roster__add');
    await win.fill('.create-form input[type="text"]', 'Toth');
    await win.click('button:has-text("Add Party Member")');
    await expect(win.locator('.content-card', { hasText: 'Toth' })).toBeVisible();

    await win.click('.campaign-detail__hero-action--danger');
    await expect(win.locator('.campaign-row', { hasText: 'Doomed Campaign' })).toHaveCount(0);
  });

  test('the Party section collapses and expands, hiding and restoring the roster', async () => {
    await win.click('.campaign-row--hollow');
    await win.fill('.create-form input[type="text"]', 'The Wildwood');
    await win.click('button:has-text("Create Campaign")');
    await win.locator('.campaign-row', { hasText: 'The Wildwood' }).click();

    await win.click('.party-roster__add');
    await win.fill('.create-form input[type="text"]', 'Fenn');
    await win.click('button:has-text("Add Party Member")');
    const card = win.locator('.content-card', { hasText: 'Fenn' });
    await expect(card).toBeVisible();

    // Open by default — collapsing unmounts the roster entirely (not just
    // hides it), but the header (title, toggle, "+ Add Party Member") stays.
    await expect(win.locator('.party-roster__toggle--open')).toBeVisible();
    await win.click('.party-roster__toggle');
    await expect(win.locator('.party-roster__toggle--open')).toHaveCount(0);
    await expect(card).toHaveCount(0);
    await expect(win.locator('.party-roster__add')).toBeVisible();

    await win.click('.party-roster__toggle');
    await expect(win.locator('.party-roster__toggle--open')).toBeVisible();
    await expect(win.locator('.content-card', { hasText: 'Fenn' })).toBeVisible();
  });

  test('a Campaign cover image round-trips through create, reload, and Remove', async () => {
    await win.click('.campaign-row--hollow');
    await win.fill('.create-form input[type="text"]', 'Illustrated Campaign');
    await win.setInputFiles('.create-form .image-upload-field input[type="file"]', path.join(imageDir, 'square.png'));
    await expect(win.locator('.create-form .image-upload-field__preview')).toBeVisible();
    await win.click('button:has-text("Create Campaign")');

    const row = win.locator('.campaign-row', { hasText: 'Illustrated Campaign' });
    await expect(row.locator('.campaign-row__art')).toBeVisible();

    await win.reload();
    await win.waitForSelector('text=Daggerheart Brewery', { timeout: 15000 });
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    const reloadedRow = win.locator('.campaign-row', { hasText: 'Illustrated Campaign' });
    await expect(reloadedRow.locator('.campaign-row__art')).toBeVisible();

    await reloadedRow.click();
    await win.getByRole('button', { name: 'Edit Campaign' }).click();
    await win.click('.create-form .image-upload-field__clear');
    await win.click('button:has-text("Save Changes")');
    await win.click('.campaign-detail__back');
    await expect(win.locator('.campaign-row', { hasText: 'Illustrated Campaign' }).locator('.campaign-row__art')).toHaveCount(0);
  });

  test("a Party member's portrait round-trips, and MemberBackdrop reads tall vs wide correctly", async () => {
    await win.click('.campaign-row--hollow');
    await win.fill('.create-form input[type="text"]', 'The Wildwood');
    await win.click('button:has-text("Create Campaign")');
    await win.locator('.campaign-row', { hasText: 'The Wildwood' }).click();

    await win.click('.party-roster__add');
    await win.fill('.create-form input[type="text"]', 'Fenn');
    await win.setInputFiles('.create-form .image-upload-field input[type="file"]', path.join(imageDir, 'portrait.png'));
    await expect(win.locator('.create-form .image-upload-field__preview')).toBeVisible();
    await win.click('button:has-text("Add Party Member")');

    // Orientation is read async (an off-screen Image() load), so the class
    // only appears once that resolves.
    const fennMember = win.locator('.party-roster__member', { hasText: 'Fenn' });
    await expect(fennMember.locator('.member-backdrop--portrait')).toBeVisible();

    await win.reload();
    await win.waitForSelector('text=Daggerheart Brewery', { timeout: 15000 });
    await win.click('.app-shell__nav-link:has-text("Campaigns")');
    await win.locator('.campaign-row', { hasText: 'The Wildwood' }).click();
    await expect(win.locator('.party-roster__member', { hasText: 'Fenn' }).locator('.member-backdrop--portrait')).toBeVisible();

    // Swap to a wide image via Edit — MemberBackdrop should re-read the new
    // image's orientation, not keep showing the stale portrait framing.
    await win.locator('.content-card', { hasText: 'Fenn' }).getByRole('button', { name: 'Edit' }).click();
    await win.setInputFiles('.create-form .image-upload-field input[type="file"]', path.join(imageDir, 'landscape.png'));
    await win.click('button:has-text("Save Changes")');
    await expect(win.locator('.party-roster__member', { hasText: 'Fenn' }).locator('.member-backdrop--landscape')).toBeVisible();
    await expect(win.locator('.party-roster__member', { hasText: 'Fenn' }).locator('.member-backdrop--portrait')).toHaveCount(0);
  });
});
