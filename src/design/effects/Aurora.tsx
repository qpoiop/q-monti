/**
 * Soft animated aurora — slowly drifting radial gradients behind hero
 * screens. Purely CSS keyframes → cheap; no JS timer per frame.
 */
export function Aurora({ tone = "gold" }: { tone?: "gold" | "purple" | "green" }) {
  const palette =
    tone === "purple"
      ? ["rgba(124,108,240,.4)", "rgba(200,85,240,.28)"]
      : tone === "green"
      ? ["rgba(52,211,153,.32)", "rgba(163,230,53,.18)"]
      : ["rgba(242,193,78,.32)", "rgba(200,85,240,.16)"];
  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-30%",
          left: "-20%",
          width: "160%",
          height: "80%",
          background: `radial-gradient(45% 55% at 40% 50%, ${palette[0]}, transparent 65%)`,
          filter: "blur(30px)",
          animation: "aurora-a 14s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-30%",
          right: "-20%",
          width: "150%",
          height: "80%",
          background: `radial-gradient(45% 55% at 60% 50%, ${palette[1]}, transparent 65%)`,
          filter: "blur(30px)",
          animation: "aurora-b 18s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes aurora-a { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(6%, 8%) scale(1.08)} }
        @keyframes aurora-b { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-8%, -6%) scale(1.1)} }
      `}</style>
    </div>
  );
}
