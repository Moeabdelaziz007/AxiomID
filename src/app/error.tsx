"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("Page error:", error);
  return (
    <div style={{
      padding: "2rem",
      fontFamily: "monospace",
      background: "var(--bg-deep)",
      color: "#ff4444",
      minHeight: "100vh",
    }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
        [ERROR] Something broke
      </h1>
      <pre style={{ whiteSpace: "pre-wrap", color: "var(--text-secondary)", fontSize: "0.8rem" }}>
        {process.env.NODE_ENV === "development" ? error.stack : `Something went wrong. Contact support with code: ${error.digest ?? "unknown"}`}
      </pre>
      <button
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
    </div>
  );
}
