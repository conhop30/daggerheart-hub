import { useEffect, useState } from 'react';
import './MemberBackdrop.css';

interface MemberBackdropProps {
  image: string;
}

// Renders a PartyMember's optional portrait behind their tile. Orientation
// decides the framing (a tall image centers and fades on both sides; a wide
// one fills the tile edge to edge), and there's no CSS-only way to tell
// which an arbitrary uploaded image is — so this loads it once off-screen
// to read its natural size, then picks.
export default function MemberBackdrop({ image }: MemberBackdropProps) {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape' | null>(null);

  useEffect(() => {
    setOrientation(null);
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setOrientation(img.naturalHeight > img.naturalWidth ? 'portrait' : 'landscape');
    };
    img.src = image;
    return () => {
      cancelled = true;
    };
  }, [image]);

  if (!orientation) return null;

  return (
    <div className={`member-backdrop member-backdrop--${orientation}`} aria-hidden="true">
      <div className="member-backdrop__image" style={{ backgroundImage: `url(${image})` }} />
      <div className="member-backdrop__scrim" />
    </div>
  );
}
