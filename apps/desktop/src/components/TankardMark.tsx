// The app's mark — same artwork as the packaged app icon/favicon
// (build/icon.png, public/favicon.png), trimmed to just the tankard+mist
// with a transparent background so it sits naturally inline in the nav bar.
export default function TankardMark({ className }: { className?: string }) {
  return <img src="/tankard-mark.png" alt="" className={className} />;
}
