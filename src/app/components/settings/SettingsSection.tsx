const FONT = "'Montserrat', sans-serif";

export interface SettingsSectionProps {
  id?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function SettingsSection({ id, title, subtitle, children }: SettingsSectionProps) {
  return (
    <section
      id={id}
      className="min-w-0 scroll-mt-24 overflow-hidden rounded-2xl sm:scroll-mt-28"
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-xs)",
        boxShadow: "var(--shadow-xs)",
        fontFamily: FONT,
      }}
    >
      <div
        className="border-b border-[var(--border-xs)] px-4 py-3.5 sm:px-5 sm:py-4"
        style={{ background: "var(--gray-50)" }}
      >
        <h2
          className="text-xs font-extrabold sm:text-[13px]"
          style={{
            fontFamily: FONT,
            color: "var(--gray-900)",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h2>
        {subtitle ? (
          <p
            className="mt-0.5 text-[11px] leading-snug sm:text-[11.5px]"
            style={{ fontFamily: FONT, color: "var(--gray-500)" }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}
