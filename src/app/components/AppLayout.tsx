import { useEffect, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  TrendingUp,
  Plus,
  LogOut,
  BookOpen,
  X,
  Menu,
  Settings,
  GraduationCap,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { BrandWordmark } from "./Brand";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/providers/ProfileProvider";
import { displayName, userInitials } from "@/lib/userDisplay";
import { canCreateCourses, normalizeProfileRole, shouldHideLearningNavigation } from "@/lib/profileRole";
import { OAUTH_SUCCESS_BANNER_KEY } from "@/services/auth.service";
import { listRecentCourses } from "@/services/courseQuery.service";

/* ─── Constants ───────────────────────────────────────────── */

const FONT = "'Montserrat', sans-serif";
const W    = 220; // sidebar width px

/* ─── Active section detection ───────────────────────────── */

function getActive(path: string): string {
  if (
    path === "/app" ||
    path.startsWith("/app/editor") ||
    path.startsWith("/app/plan") ||
    path.startsWith("/app/qa") ||
    path.startsWith("/app/versions") ||
    path.startsWith("/app/learners")
  ) return "courses";
  if (path.startsWith("/app/create")) return "create";
  if (path.startsWith("/app/progress")) return "progress";
  if (path.startsWith("/app/settings")) return "settings";
  if (path.startsWith("/learn")) return "learn";
  return "";
}

/* ─── Sidebar primitives ──────────────────────────────────── */

function SectionLabel({ label }: { label: string }) {
  return (
    <p
      style={{
        fontFamily: FONT, fontWeight: 700,
        fontSize: "9px", letterSpacing: "0.1em",
        color: "var(--gray-400)", textTransform: "uppercase",
        padding: "0 10px", marginBottom: 3, marginTop: 18,
        userSelect: "none",
      }}
    >
      {label}
    </p>
  );
}

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick?: () => void;
}

function NavItem({ to, icon: Icon, label, active, onClick }: NavItemProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 9,
        padding: "7px 10px", borderRadius: 9,
        fontFamily: FONT, fontWeight: active ? 700 : 500,
        fontSize: "13px", textDecoration: "none",
        color: active ? "var(--brand-blue)" : "var(--gray-700)",
        background: active ? "rgba(74,144,226,0.08)" : "transparent",
        transition: "all 0.12s", userSelect: "none",
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)";
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      <Icon
        style={{
          width: 16, height: 16, flexShrink: 0,
          color: active ? "var(--brand-blue)" : "var(--gray-500)",
        }}
      />
      <span
        style={{
          flex: 1, overflow: "hidden",
          textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </Link>
  );
}

function RecentCourseItem({
  id, title, onClick,
}: { id: string; title: string; onClick?: () => void }) {
  return (
    <Link
      to={`/app/editor/${id}`}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "6px 10px", borderRadius: 8,
        fontFamily: FONT, fontSize: "12px", fontWeight: 500,
        color: "var(--gray-600)", textDecoration: "none",
        transition: "all 0.12s",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = "rgba(0,0,0,0.04)";
        el.style.color = "var(--gray-900)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = "transparent";
        el.style.color = "var(--gray-600)";
      }}
    >
      <div
        style={{
          width: 5, height: 5, borderRadius: "50%",
          background: "var(--gray-300)", flexShrink: 0,
        }}
      />
      <span
        style={{
          flex: 1, overflow: "hidden",
          textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}
      >
        {title}
      </span>
    </Link>
  );
}

function ActionButton({
  icon: Icon, label, onClick,
}: { icon: React.ElementType; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 9,
        padding: "7px 10px", borderRadius: 9, width: "100%",
        fontFamily: FONT, fontWeight: 500, fontSize: "13px",
        color: "var(--gray-700)", background: "transparent",
        border: "none", cursor: "pointer",
        transition: "background 0.12s", textAlign: "left",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Icon style={{ width: 16, height: 16, color: "var(--gray-500)", flexShrink: 0 }} />
      {label}
    </button>
  );
}

/* ─── User block ──────────────────────────────────────────── */

function UserBlock({ onClose }: { onClose?: () => void }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  if (!user) return null;

  return (
    <Link
      to="/app/profile"
      onClick={onClose}
      style={{
        display: "flex", alignItems: "center", gap: 9,
        padding: "8px 10px", borderRadius: 10,
        fontFamily: FONT, marginBottom: 2,
        textDecoration: "none", transition: "background 0.12s",
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
    >
      <div
        style={{
          width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
          background: "rgba(74,144,226,0.1)",
          border: "1px solid rgba(74,144,226,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: FONT, fontWeight: 800,
          fontSize: "10px", color: "var(--brand-blue)",
          userSelect: "none",
        }}
      >
        {userInitials(user, profile)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: FONT, fontWeight: 700,
            fontSize: "12px", color: "var(--gray-900)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            lineHeight: 1.3,
          }}
        >
          {displayName(user, profile)}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "10px", color: "var(--gray-400)", marginTop: 1 }}>
          {user.email ?? ""}
        </p>
      </div>
    </Link>
  );
}

/* ─── Assembled Sidebar ───────────────────────────────────── */

function Sidebar({
  onClose,
  recentCourses,
  learnHref,
  canCreate,
  showLearningNav,
}: {
  onClose?: () => void;
  recentCourses: { id: string; title: string }[];
  learnHref: string;
  canCreate: boolean;
  showLearningNav: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const active = getActive(location.pathname);

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      navigate("/auth/login", { replace: true });
    }
  };

  return (
    <aside
      style={{
        width: W, minWidth: W,
        height: "100vh",
        display: "flex", flexDirection: "column",
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-xs)",
        fontFamily: FONT,
      }}
    >
      {/* ── Brand ── */}
      <div
        style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          padding: "15px 14px 14px",
          borderBottom: "1px solid var(--border-xs)",
          flexShrink: 0,
        }}
      >
        <Link
          to="/app"
          onClick={onClose}
          style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", minWidth: 0 }}
          aria-label="На главную страницу приложения"
        >
          <BrandWordmark logoSize="sm" textClassName="text-sm" />
        </Link>

        {/* Close button — mobile only */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: "var(--gray-400)", padding: 4, borderRadius: 6,
              display: "flex", alignItems: "center",
            }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav
        style={{
          flex: 1, overflowY: "auto", overflowX: "hidden",
          padding: "10px 8px",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Create course CTA */}
        {canCreate && (
          <Link
            to="/app/create"
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px", borderRadius: 10, marginBottom: 8,
              fontFamily: FONT, fontWeight: 700, fontSize: "12.5px",
              color: "white", textDecoration: "none",
              background: active === "create" ? "var(--brand-blue-dark, #1E3A5F)" : "var(--brand-blue)",
              transition: "opacity 0.15s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            <Plus style={{ width: 15, height: 15 }} />
            Создать курс
          </Link>
        )}

        {/* Primary nav items */}
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <NavItem
            to="/app"
            icon={LayoutDashboard}
            label="Мои курсы"
            active={active === "courses"}
            onClick={onClose}
          />
          {showLearningNav && (
            <>
              <NavItem
                to="/app/progress"
                icon={TrendingUp}
                label="Прогресс"
                active={active === "progress"}
                onClick={onClose}
              />
              <NavItem
                to={learnHref}
                icon={GraduationCap}
                label="Учиться"
                active={active === "learn"}
                onClick={onClose}
              />
            </>
          )}
        </div>

        {/* Recent courses */}
        {recentCourses.length > 0 && (
          <>
            <SectionLabel label="Недавние" />
            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {recentCourses.map((c) => (
                <RecentCourseItem key={c.id} id={c.id} title={c.title} onClick={onClose} />
              ))}
            </div>

            <Link
              to="/app"
              onClick={onClose}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "5px 10px", marginTop: 4,
                fontFamily: FONT, fontSize: "11px", fontWeight: 600,
                color: "var(--gray-400)", textDecoration: "none",
                transition: "color 0.12s", borderRadius: 8,
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--brand-blue)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--gray-400)")}
            >
              <BookOpen style={{ width: 12, height: 12 }} />
              Все курсы
            </Link>
          </>
        )}
      </nav>

      {/* ── Bottom ── */}
      <div
        style={{
          borderTop: "1px solid var(--border-xs)",
          padding: "8px 8px",
          flexShrink: 0,
        }}
      >
        <UserBlock onClose={onClose} />
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <ThemeToggle />
          <Link
            to="/app/settings"
            onClick={onClose}
            style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: "7px 10px", borderRadius: 9, width: "100%",
              fontFamily: FONT, fontWeight: active === "settings" ? 700 : 500, fontSize: "13px",
              color: active === "settings" ? "var(--brand-blue)" : "var(--gray-700)",
              background: active === "settings" ? "rgba(74,144,226,0.08)" : "transparent",
              textDecoration: "none", transition: "all 0.12s", textAlign: "left",
            }}
            onMouseEnter={(e) => {
              if (active !== "settings") (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.04)";
            }}
            onMouseLeave={(e) => {
              if (active !== "settings") (e.currentTarget as HTMLElement).style.background = "transparent";
            }}
          >
            <Settings
              style={{
                width: 16, height: 16, flexShrink: 0,
                color: active === "settings" ? "var(--brand-blue)" : "var(--gray-500)",
              }}
            />
            Настройки
          </Link>
          <ActionButton icon={LogOut} label="Выйти" onClick={handleLogout} />
        </div>
      </div>
    </aside>
  );
}

/* ─── App layout ──────────────────────────────────────────── */

export default function AppLayout() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const role = normalizeProfileRole(profile?.app_role);
  const canCreate = canCreateCourses(role);
  const showLearningNav = !shouldHideLearningNavigation(role, profile?.hide_learning_navigation);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [oauthBanner, setOauthBanner] = useState<string | null>(null);
  const [recentCourses, setRecentCourses] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    try {
      const msg = sessionStorage.getItem(OAUTH_SUCCESS_BANNER_KEY);
      if (msg) {
        sessionStorage.removeItem(OAUTH_SUCCESS_BANNER_KEY);
        setOauthBanner(msg);
      }
    } catch {
      /* sessionStorage недоступен */
    }
  }, []);

  useEffect(() => {
    if (!user?.id || !canCreate) {
      setRecentCourses([]);
      return;
    }
    let cancelled = false;
    void listRecentCourses(user.id, 2).then(({ items }) => {
      if (!cancelled) setRecentCourses(items);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id, canCreate]);

  const learnHref = recentCourses[0] ? `/learn/${recentCourses[0].id}` : "/app";

  return (
    <div
      style={{
        display: "flex", minHeight: "100vh",
        fontFamily: FONT, background: "var(--bg-page)",
      }}
    >
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden"
          style={{
            position: "fixed", inset: 0, zIndex: 40,
            background: "rgba(0,0,0,0.35)",
          }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — sticky on desktop, fixed drawer on mobile */}
      <div
        style={{
          position: "sticky",
          top: 0, flexShrink: 0,
          height: "100vh",
          zIndex: 50,
        }}
        className="hidden md:block"
      >
        <Sidebar recentCourses={recentCourses} learnHref={learnHref} canCreate={canCreate} showLearningNav={showLearningNav} />
      </div>

      {/* Mobile sidebar drawer */}
      <div
        className="md:hidden"
        style={{
          position: "fixed", top: 0, left: 0,
          height: "100vh", zIndex: 50,
          transform: mobileOpen ? "translateX(0)" : `translateX(-${W}px)`,
          transition: "transform 0.2s ease",
        }}
      >
        <Sidebar onClose={() => setMobileOpen(false)} recentCourses={recentCourses} learnHref={learnHref} canCreate={canCreate} showLearningNav={showLearningNav} />
      </div>

      {/* Main content */}
      <main style={{ flex: 1, minWidth: 0, overflowX: "hidden" }}>
        {/* Mobile top bar */}
        <div
          className="md:hidden"
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "0 16px", height: 52,
            background: "var(--bg-surface)", borderBottom: "1px solid var(--border-xs)",
            position: "sticky", top: 0, zIndex: 30,
          }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            style={{
              background: "transparent", border: "none",
              cursor: "pointer", color: "var(--gray-700)",
              display: "flex", alignItems: "center", padding: 4, borderRadius: 6,
            }}
          >
            <Menu style={{ width: 20, height: 20 }} />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <BrandWordmark logoSize="xs" textClassName="text-[13px]" />
          </div>
        </div>

        {oauthBanner && (
          <div
            role="status"
            className="flex items-start gap-3 px-4 py-3 md:px-6"
            style={{
              background: "rgba(46, 204, 113, 0.1)",
              borderBottom: "1px solid rgba(46, 204, 113, 0.25)",
              color: "#1E8449",
              fontSize: "var(--text-sm)",
            }}
          >
            <span className="flex-1 min-w-0 pt-0.5">{oauthBanner}</span>
            <button
              type="button"
              onClick={() => setOauthBanner(null)}
              aria-label="Закрыть"
              className="shrink-0 p-1.5 rounded-lg touch-manipulation"
              style={{
                color: "#1E8449",
                border: "none",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
        )}

        <Outlet />
      </main>
    </div>
  );
}
