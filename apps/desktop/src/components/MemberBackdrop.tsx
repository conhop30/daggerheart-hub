import { useEffect, useState } from 'react';
import './MemberBackdrop.css';

/** One Class's worth of background: its Subclass's picture, over the colours of that Class's two Domains. */
export interface BackdropLayer {
  image: string | null;
  /** Shown wherever the image isn't: none uploaded, still loading, or failed to load. */
  colors: string[];
}

interface MemberBackdropProps {
  /** One layer fills the tile; two (a multiclassed PC's two Classes) take half each. */
  layers: BackdropLayer[];
}

// The two Domain colours blended corner to corner (or the one, if only one
// is known). Always a gradient, so it can sit under an image in the same
// `background-image` list.
function colorFill(colors: string[]): string | null {
  if (colors.length === 0) return null;
  return `linear-gradient(135deg, ${colors[0]}, ${colors[1] ?? colors[0]})`;
}

// Renders what's behind a PartyMember's tile: their own portrait, or the
// themed background of the Subclass they play, with their Class's Domain
// colours underneath as the fallback.
export default function MemberBackdrop({ layers }: MemberBackdropProps) {
  if (layers.length >= 2) {
    return (
      <div className="member-backdrop member-backdrop--split" aria-hidden="true">
        {layers.slice(0, 2).map((layer, i) => (
          <div
            key={i}
            className="member-backdrop__half"
            // A picture that fails to load simply leaves the colours showing.
            style={{ backgroundImage: [layer.image && `url(${layer.image})`, colorFill(layer.colors)].filter(Boolean).join(', ') }}
          />
        ))}
        <div className="member-backdrop__scrim" />
      </div>
    );
  }
  return <SingleBackdrop layer={layers[0]} />;
}

// Orientation decides the framing (a tall image centers and fades on both
// sides; a wide one fills the tile edge to edge), and there's no CSS-only
// way to tell which an arbitrary uploaded image is — so this loads it once
// off-screen to read its natural size, then picks.
function SingleBackdrop({ layer }: { layer: BackdropLayer }) {
  const { image } = layer;
  const [orientation, setOrientation] = useState<'portrait' | 'landscape' | null>(null);

  useEffect(() => {
    setOrientation(null);
    if (!image) return;
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

  // Until (or unless) the image loads, the colours stand in for it.
  const fill = colorFill(layer.colors);
  if (!orientation && !fill) return null;

  return (
    <div className={`member-backdrop member-backdrop--${orientation ?? 'landscape'}`} style={fill ? { backgroundImage: fill } : undefined} aria-hidden="true">
      {image && orientation && <div className="member-backdrop__image" style={{ backgroundImage: `url(${image})` }} />}
      <div className="member-backdrop__scrim" />
    </div>
  );
}
