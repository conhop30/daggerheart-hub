// The app's mark: a tankard tipped toward the top right, pouring a misty
// blue-to-teal stream down past its own edge — same silhouette and gradient
// family as build/icon.svg (the packaged app icon/favicon), just cropped
// tighter (no background square) so it sits naturally inline in the nav bar.
export default function TankardMark({ className }: { className?: string }) {
  return (
    <svg viewBox="45 70 215 186" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="mark-tankard" x1="60" y1="90" x2="160" y2="250" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7986d4" />
          <stop offset="1" stopColor="#333a72" />
        </linearGradient>
        <linearGradient id="mark-handle" x1="44" y1="140" x2="88" y2="212" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8b96de" />
          <stop offset="1" stopColor="#4a55a0" />
        </linearGradient>
        <linearGradient id="mark-mist" x1="150" y1="80" x2="245" y2="250" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#3c3a7c" />
          <stop offset="0.5" stopColor="#2f74b8" />
          <stop offset="1" stopColor="#82ecd6" />
        </linearGradient>
      </defs>

      <g transform="rotate(16 86 216)">
        <path
          d="M 86 140 C 52 140, 44 160, 44 175 C 44 190, 52 210, 88 212"
          fill="none"
          stroke="#14121f"
          strokeWidth={22}
          strokeLinecap="round"
        />
        <path
          d="M 86 140 C 52 140, 44 160, 44 175 C 44 190, 52 210, 88 212"
          fill="none"
          stroke="url(#mark-handle)"
          strokeWidth={13}
          strokeLinecap="round"
        />
        <path
          d="M 86 90 L 190 90 L 180 220
             C 179 226, 170 231, 163 231
             L 108 231
             C 100 231, 92 226, 92 220 Z"
          fill="url(#mark-tankard)"
          stroke="#14121f"
          strokeWidth={6}
          strokeLinejoin="round"
        />
        <path d="M 88 138 L 186 132" stroke="#14121f" strokeWidth={5} opacity={0.4} strokeLinecap="round" />
        <path d="M 89 182 L 183 177" stroke="#14121f" strokeWidth={5} opacity={0.4} strokeLinecap="round" />
        <ellipse cx={138} cy={90} rx={54} ry={13} fill="#2a2760" stroke="#14121f" strokeWidth={5} />
        <ellipse cx={138} cy={87} rx={46} ry={8} fill="#464483" opacity={0.6} />
      </g>

      <g fill="none" strokeLinecap="round">
        <path
          d="M 172 100 C 204 90, 230 108, 224 140 C 220 172, 214 196, 236 250"
          stroke="url(#mark-mist)"
          strokeWidth={19}
          opacity={0.95}
        />
        <path
          d="M 166 114 C 190 110, 206 124, 200 148 C 196 176, 208 198, 202 222"
          stroke="url(#mark-mist)"
          strokeWidth={10}
          opacity={0.5}
        />
        <path d="M 178 96 C 198 88, 212 98, 208 114" stroke="url(#mark-mist)" strokeWidth={8} opacity={0.75} />
      </g>
    </svg>
  );
}
