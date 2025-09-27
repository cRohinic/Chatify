// src/components/BorderAnimatedContainer.jsx
import React from "react";

function BorderAnimatedContainer({ children }) {
  return (
    <div
      className="w-full h-full rounded-2xl border border-transparent overflow-hidden flex relative"
      style={{
        background: `
          linear-gradient(45deg, #172033 0%, #1e293b 50%, #172033 100%) padding-box,
          conic-gradient(
            from 0deg,
            rgba(100, 116, 139, 0.48) 80%,
            #06b6d4 86%,
            #22d3ee 90%,
            #06b6d4 94%,
            rgba(100, 116, 139, 0.48) 100%
          ) border-box
        `,
        border: "2px solid transparent",
        animation: "border-rotate 4s linear infinite",
      }}
    >
      {children}
      {/* Add this style tag for the keyframes if not in Tailwind config */}
      <style>{`
        @keyframes border-rotate {
          0% { --border-angle: 0deg; }
          100% { --border-angle: 360deg; }
        }
      `}</style>
    </div>
  );
}

export default BorderAnimatedContainer;
