export default function SuspenseFallback() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--bg-page)" }}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="rounded-full animate-spin"
          style={{
            width: "28px",
            height: "28px",
            border: "2px solid var(--gray-200)",
            borderTopColor: "var(--brand-blue)",
          }}
        />
        <p style={{ fontSize: "var(--text-xs)", color: "var(--gray-400)", fontWeight: 600 }}>
          Загрузка...
        </p>
      </div>
    </div>
  );
}
