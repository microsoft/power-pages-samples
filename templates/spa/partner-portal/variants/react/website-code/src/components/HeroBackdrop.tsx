/**
 * Hero backdrop: a generated "partner network" constellation.
 *
 * Rendered in code rather than shipped as an image so it stays license-clean,
 * resolution-independent and free of any external host. Four stacked layers:
 * hairline Swiss grid, indigo glow, node mesh, and a left-side scrim that
 * protects the contrast of the hero copy.
 */

type Node = { x: number; y: number; r: number; hub?: boolean }

const NODES: Node[] = [
  { x: 120, y: 90, r: 3 },
  { x: 250, y: 50, r: 4, hub: true },
  { x: 390, y: 120, r: 3 },
  { x: 520, y: 70, r: 5, hub: true },
  { x: 60, y: 210, r: 4 },
  { x: 200, y: 190, r: 6, hub: true },
  { x: 340, y: 250, r: 3 },
  { x: 470, y: 200, r: 4 },
  { x: 560, y: 300, r: 3 },
  { x: 110, y: 340, r: 5, hub: true },
  { x: 260, y: 320, r: 3 },
  { x: 400, y: 380, r: 5, hub: true },
  { x: 540, y: 430, r: 4 },
  { x: 160, y: 470, r: 3 },
  { x: 300, y: 500, r: 4, hub: true },
  { x: 450, y: 540, r: 3 },
  { x: 90, y: 560, r: 4 },
  { x: 580, y: 150, r: 2 },
]

/** Index pairs into NODES. A partner mesh, not a radial hub-and-spoke. */
const EDGES: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [0, 4], [4, 5], [5, 1], [5, 10], [2, 6],
  [6, 7], [3, 7], [7, 8], [4, 9], [9, 10], [10, 11], [6, 11], [11, 12],
  [8, 12], [9, 13], [13, 14], [14, 11], [14, 15], [15, 12], [13, 16], [3, 17], [17, 8],
]

export default function HeroBackdrop() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden" style={{ pointerEvents: 'none' }}>
      {/* Hairline grid: 88px cells, the Swiss substrate */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px),' +
            'linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '88px 88px',
          maskImage: 'radial-gradient(120% 90% at 78% 32%, black 0%, rgba(0,0,0,0.55) 48%, transparent 82%)',
          WebkitMaskImage: 'radial-gradient(120% 90% at 78% 32%, black 0%, rgba(0,0,0,0.55) 48%, transparent 82%)',
        }}
      />

      {/* Teal glow: one restrained accent, anchored behind the constellation */}
      <div
        className="absolute"
        style={{
          top: '-18%',
          right: '-12%',
          width: '68%',
          height: '92%',
          background: 'radial-gradient(circle at center, rgba(0,108,112,0.22) 0%, rgba(0,108,112,0.07) 42%, transparent 70%)',
        }}
      />
      <div
        className="absolute"
        style={{
          bottom: '-28%',
          left: '-10%',
          width: '52%',
          height: '70%',
          background: 'radial-gradient(circle at center, rgba(139,211,212,0.08) 0%, transparent 65%)',
        }}
      />

      {/* Partner network */}
      <svg
        className="absolute"
        viewBox="0 0 600 600"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        style={{
          top: 0,
          right: 0,
          height: '100%',
          width: '62%',
          minWidth: 520,
          maskImage: 'linear-gradient(to left, black 0%, black 34%, rgba(0,0,0,0.35) 66%, transparent 92%)',
          WebkitMaskImage: 'linear-gradient(to left, black 0%, black 34%, rgba(0,0,0,0.35) 66%, transparent 92%)',
        }}
      >
        <g stroke="#8BD3D4" strokeWidth="1" strokeOpacity="0.16">
          {EDGES.map(([a, b]) => (
            <line key={`${a}-${b}`} x1={NODES[a].x} y1={NODES[a].y} x2={NODES[b].x} y2={NODES[b].y} />
          ))}
        </g>

        {NODES.map((node, i) =>
          node.hub
            ? (
              <g key={i}>
                <circle
                  className="hero-node-pulse"
                  cx={node.x}
                  cy={node.y}
                  r={node.r * 3.2}
                  fill="#006C70"
                  fillOpacity="0.14"
                  style={{ animationDelay: `${i * 0.45}s` }}
                />
                <circle cx={node.x} cy={node.y} r={node.r} fill="#8BD3D4" />
              </g>
            )
            : <circle key={i} cx={node.x} cy={node.y} r={node.r} fill="white" fillOpacity="0.22" />,
        )}
      </svg>

      {/* Copy scrim: keeps the headline and stats at full contrast */}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(20,45,64,0.82) 0%, rgba(20,45,64,0.5) 14%, transparent 32%)' }}
      />
      <div
        className="absolute inset-0 hidden md:block"
        style={{ background: 'linear-gradient(to right, #142D40 0%, rgba(20,45,64,0.92) 26%, rgba(20,45,64,0.45) 54%, transparent 76%)' }}
      />
      {/* Below md the copy spans the full width, so the network recedes to a texture */}
      <div
        className="absolute inset-0 md:hidden"
        style={{ background: 'linear-gradient(to bottom, rgba(20,45,64,0.94) 0%, rgba(20,45,64,0.9) 70%, rgba(20,45,64,0.62) 100%)' }}
      />
    </div>
  )
}
