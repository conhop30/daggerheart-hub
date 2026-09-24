// One command to cut a release that installed copies can update to:
//
//   npm run release -- --notes path/to/notes.md          build, verify, publish
//   npm run release -- --dry-run                          build and verify only; publishes nothing
//
// The in-app updater needs three files on the GitHub release: the installer,
// its .blockmap, and latest.yml (the manifest naming the installer and its
// checksum). Forgetting one silently downgrades installed copies from "Update
// now" to "View download", so this builds them together, checks they agree with
// package.json, and only then publishes. It refuses to run in situations that
// would publish something wrong (a tag that already exists, uncommitted or
// unpushed work), and builds in the OS temp folder because electron-builder
// fails inside a OneDrive-synced folder.
//
// CommonJS on purpose: package.json is "type": "module".
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const notesIndex = args.indexOf('--notes');
const notesFile = notesIndex >= 0 ? args[notesIndex + 1] : null;

const root = path.resolve(__dirname, '..');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const tag = `v${version}`;
const installer = `Daggerheart-Homebrew-Hub-Setup-${version}.exe`;
const outDir = path.join(os.tmpdir(), `dh-release-${version}`);
const REPO = 'conhop30/daggerheart-hub';

function fail(message) {
  console.error(`\nRelease stopped: ${message}`);
  process.exit(1);
}

function run(command, commandArgs, { capture = false } = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    shell: true, // npm/npx/gh are .cmd shims on Windows
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
  return { ok: result.status === 0, out: (result.stdout || '').trim() };
}

console.log(`Releasing ${tag}${dryRun ? ' (dry run: nothing will be published)' : ''}\n`);

// ---- Preconditions ----
if (!dryRun) {
  if (!notesFile) fail('pass release notes with --notes <file.md> (or use --dry-run).');
  if (!fs.existsSync(notesFile)) fail(`notes file not found: ${notesFile}`);
  if (run('git', ['status', '--porcelain'], { capture: true }).out) fail('there are uncommitted changes; commit them first.');
  if (run('git', ['rev-list', '@{u}..HEAD', '--count'], { capture: true }).out !== '0') {
    fail('there are unpushed commits; push first so the release tag points at what you built.');
  }
  if (run('gh', ['release', 'view', tag, '--repo', REPO], { capture: true }).ok) {
    fail(`${tag} already exists. Bump "version" in apps/desktop/package.json first.`);
  }
}

// ---- Build ----
fs.rmSync(outDir, { recursive: true, force: true });
if (!run('npm', ['run', 'build']).ok) fail('the app build failed.');
if (!run('npx', ['electron-builder', '--win', '--publish', 'never', `--config.directories.output="${outDir}"`]).ok) {
  fail('electron-builder failed.');
}

// ---- Verify the three files agree with each other and with package.json ----
const files = [installer, `${installer}.blockmap`, 'latest.yml'];
for (const name of files) {
  if (!fs.existsSync(path.join(outDir, name))) fail(`the build did not produce ${name}.`);
}
const manifest = fs.readFileSync(path.join(outDir, 'latest.yml'), 'utf8');
if (!new RegExp(`^version: ${version.replace(/\./g, '\\.')}$`, 'm').test(manifest)) {
  fail(`latest.yml does not say version ${version}.`);
}
if (!manifest.includes(`path: ${installer}`)) fail(`latest.yml does not point at ${installer}.`);
const size = fs.statSync(path.join(outDir, installer)).size;
if (!manifest.includes(`size: ${size}`)) fail('latest.yml records a different installer size than the file built.');
console.log(`\nVerified: ${files.join(', ')} are present and consistent with version ${version}.`);

if (dryRun) {
  console.log(`\nDry run complete. Would publish ${tag} with the three files above from:\n  ${outDir}`);
  process.exit(0);
}

// ---- Publish, then confirm what actually landed ----
const upload = files.map((name) => `"${path.join(outDir, name)}"`);
const created = run('gh', [
  'release', 'create', tag, ...upload,
  '--repo', REPO, '--target', 'main', '--title', `"Daggerheart Homebrew Hub ${version}"`, '--notes-file', `"${notesFile}"`,
]);
if (!created.ok) fail('gh release create failed.');

const listed = run('gh', ['release', 'view', tag, '--repo', REPO, '--json', 'assets', '--jq', '".assets[].name"'], { capture: true }).out;
const missing = files.filter((name) => !listed.split(/\r?\n/).includes(name));
if (missing.length) fail(`published, but these are missing from the release: ${missing.join(', ')}. Attach them by hand.`);
console.log(`\nPublished ${tag} with all three update files: https://github.com/${REPO}/releases/tag/${tag}`);
console.log('Reminder: point the portfolio download button at the new version.');
