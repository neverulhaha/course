const FONT = "'Montserrat', sans-serif";

export interface DangerZoneProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

/** Subtle destructive grouping — not aggressive, clearly separated */
export function DangerZone({
  title = "Опасная зона",
  description = "Действия ниже могут быть необратимыми.",
  children,
}: DangerZoneProps) {
  return (
    <div
      className="rounded-xl border px-4 py-4 sm:px-4 sm:py-4"
      style={{
        fontFamily: FONT,
        borderColor: "rgba(231,76,60,0.18)",
        background: "rgba(231,76,60,0.04)",
      }}
    >
      <p
        className="text-[10px] font-extrabold uppercase tracking-wider"
        style={{ fontFamily: FONT, color: "#E74C3C" }}
      >
        {title}
      </p>
      <p
        className="mb-4 mt-1 text-[11px] leading-relaxed"
        style={{ fontFamily: FONT, color: "var(--gray-500)" }}
      >
        {description}
      </p>
      <div className="flex min-w-0 flex-col gap-2">{children}</div>
    </div>
  );
}
