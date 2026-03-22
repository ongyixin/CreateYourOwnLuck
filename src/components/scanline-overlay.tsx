"use client";

export default function ScanlineOverlay() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[45] hidden dark:block">
      <div className="absolute inset-0" style={{
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)',
      }} />
      <div className="absolute inset-0 opacity-[0.05]" style={{
        backgroundImage: `radial-gradient(circle, currentColor 0.8px, transparent 0.8px)`,
        backgroundSize: '5px 5px',
      }} />
      <div className="absolute inset-0 opacity-[0.025]" style={{
        backgroundImage: `radial-gradient(circle, currentColor 0.5px, transparent 0.5px)`,
        backgroundSize: '5px 5px',
        backgroundPosition: '2.5px 2.5px',
      }} />
      <svg className="absolute inset-0 w-full h-full opacity-[0.10]" xmlns="http://www.w3.org/2000/svg">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
      <div
        className="absolute left-0 w-full h-[1px] scan-line opacity-30"
        style={{ background: 'linear-gradient(90deg, transparent, hsl(153 100% 50% / 0.2), transparent)' }}
      />
    </div>
  );
}
