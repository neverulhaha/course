import { type ReactNode } from "react";
import { Link } from "react-router";
import { ArrowLeft } from "lucide-react";

interface Breadcrumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  backTo?: string;
  backLabel?: string;
  breadcrumbs?: Breadcrumb[];
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({
  backTo,
  backLabel = "Назад",
  breadcrumbs,
  title,
  subtitle,
  badge,
  actions,
}: PageHeaderProps) {
  return (
    <div
      style={{
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-sm)",
      }}
    >
      <div style={{ maxWidth: "calc(100vw - 56px)", margin: "0", padding: "24px 32px" }}>
        {/* Back + breadcrumbs */}
        {(backTo || breadcrumbs) && (
          <div
            className="flex items-center gap-2 mb-4"
            style={{ fontSize: "var(--text-xs)" }}
          >
            {backTo && (
              <Link
                to={backTo}
                className="inline-flex items-center gap-1.5 font-semibold transition-colors group"
                style={{ color: "var(--gray-500)" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gray-900)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gray-500)")}
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
                {backLabel}
              </Link>
            )}
            {backTo && breadcrumbs && <span style={{ color: "var(--gray-300)" }}>/</span>}
            {breadcrumbs?.map((crumb, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span style={{ color: "var(--gray-300)" }}>/</span>}
                {crumb.to ? (
                  <Link
                    to={crumb.to}
                    className="font-medium transition-colors"
                    style={{ color: "var(--gray-500)" }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gray-900)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gray-500)")}
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span style={{ color: "var(--gray-700)", fontWeight: 600 }}>{crumb.label}</span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Title row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1
                className="font-bold tracking-tight leading-tight"
                style={{ fontSize: "var(--text-2xl)", color: "var(--gray-900)" }}
              >
                {title}
              </h1>
              {badge}
            </div>
            {subtitle && (
              <p
                className="mt-1"
                style={{ fontSize: "var(--text-sm)", color: "var(--gray-500)" }}
              >
                {subtitle}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2.5 flex-shrink-0">{actions}</div>
          )}
        </div>
      </div>
    </div>
  );
}
