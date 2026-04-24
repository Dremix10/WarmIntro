export function GradientOrb({
  className = "",
  size = 560,
  opacity = 0.7,
}: {
  className?: string;
  size?: number;
  opacity?: number;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute ${className}`}
      style={{
        width: size,
        height: size,
        background:
          "radial-gradient(circle, rgba(232,179,57,0.35), rgba(200,107,79,0.18), transparent 70%)",
        filter: "blur(60px)",
        opacity,
        animation: "orb-drift 28s ease-in-out infinite",
        willChange: "transform",
      }}
    />
  );
}
