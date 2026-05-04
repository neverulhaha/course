import { cn } from "@/app/components/ui/utils";

const FONT = "'Montserrat', sans-serif";

export interface SettingsNavItem {
  href: string;
  label: string;
}

export interface SettingsLayoutProps {
  title: string;
  subtitle?: string;
  navItems?: SettingsNavItem[];
  children: React.ReactNode;
}

export function SettingsLayout({ title, subtitle, navItems, children }: SettingsLayoutProps) {
  return (
    <div className="min-h-dvh min-h-[100vh]" style={{ fontFamily: FONT, background: "var(--bg-page)" }}>
      <header
        className="border-b border-[var(--border-xs)] px-4 pb-5 pt-6 sm:px-6 sm:pb-6 sm:pt-7 lg:px-8 lg:pb-6 lg:pt-8"
        style={{ background: "var(--bg-surface)" }}
      >
        <div className="mx-auto max-w-[1100px]">
          <h1
            className="mb-1.5 text-[22px] font-extrabold leading-tight tracking-tight sm:text-2xl lg:text-[var(--text-2xl)]"
            style={{ fontFamily: FONT, color: "var(--gray-900)", letterSpacing: "-0.025em" }}
          >
            {title}
          </h1>
          {subtitle ? (
            <p
              className="max-w-2xl text-[11px] leading-relaxed sm:text-[var(--text-xs)]"
              style={{ fontFamily: FONT, color: "var(--gray-400)" }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1100px] px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
        <div
          className={cn(
            "min-w-0",
            navItems?.length
              ? "xl:grid xl:grid-cols-[minmax(0,200px)_minmax(0,1fr)] xl:items-start xl:gap-10"
              : "",
          )}
        >
          {navItems?.length ? (
            <nav
              className="hidden min-w-0 xl:sticky xl:top-6 xl:block xl:self-start"
              aria-label="Разделы настроек"
            >
              <ul className="flex flex-col gap-0.5 border-l border-[var(--border-xs)] pl-3">
                {navItems.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="block rounded-md py-1.5 pl-2 text-[12px] font-semibold text-[var(--gray-500)] transition-colors hover:text-[var(--brand-blue)]"
                      style={{ fontFamily: FONT }}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}

          <div className="min-w-0 xl:min-w-0">
            {navItems?.length ? (
              <div className="mb-5 flex min-w-0 flex-wrap gap-2 xl:hidden">
                {navItems.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="rounded-lg border border-[var(--border-xs)] bg-[var(--bg-surface)] px-3 py-2 text-[11px] font-semibold text-[var(--gray-600)] shadow-[var(--shadow-xs)] transition-colors hover:border-[var(--brand-blue)] hover:text-[var(--brand-blue)]"
                    style={{ fontFamily: FONT }}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            ) : null}
            <div className="flex min-w-0 flex-col gap-4 sm:gap-5">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
