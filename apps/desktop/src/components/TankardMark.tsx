// The app's mark — same artwork as the packaged app icon/favicon
// (build/icon.png, public/favicon.png), trimmed to just the tankard+mist
// with a transparent background so it sits naturally inline in the nav bar.
export default function TankardMark({ className }: { className?: string }) {
  // Relative, not absolute — an absolute /tankard-mark.png resolves to the
  // filesystem root under the packaged app's file:// load, not the dist
  // folder (same trap vite.config.ts documents for base: './').
  return <img src="./tankard-mark.png" alt="" className={className} />;
}
