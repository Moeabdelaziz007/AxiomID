"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{
        padding: "2rem",
        fontFamily: "monospace",
        background: "var(--bg-deep)",
        color: "#ff4444",
        minHeight: "100vh",
        margin: 0,
      }}>
        <style>{`.retry-btn:focus-visible { outline: 2px solid #00ff41; outline-offset: 2px; }`}</style>
        <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
          [ROOT ERROR] AxiomID failed to initialize
        </h1>
        <pre style={{ whiteSpace: "pre-wrap", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
          {process.env.NODE_ENV === "development" ? error.stack : `Something went wrong. Contact support with code: ${error.digest ?? "unknown"}`}
        </pre>
        <button
          className="retry-btn"
          onClick={reset}
          style={{
            marginTop: "1rem",
            padding: "0.5rem 1rem",
            background: "var(--neon-green)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          RETRY
        </button>
      </body>
    </html>
  );
}
