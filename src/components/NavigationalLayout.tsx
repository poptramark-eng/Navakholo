"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ==========================================
// USER TYPES
// ==========================================

export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  school: {
    id: string;
    name: string;
  } | null;
};

type UserContextType = {
  user: User | null;
  loading: boolean;
};

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
});

export function useCurrentUser() {
  return useContext(UserContext);
}

// ==========================================
// NAVIGATION CONFIGURATION
// ==========================================

type NavigationItem = {
  title: string;
  href: string;
  icon: string;
};

const navigation: NavigationItem[] = [
  { title: "Dashboard", href: "/", icon: "⌂" },
  { title: "Add Students", href: "/dashboard/student", icon: "♙" },
  { title: "Marks Entry", href: "/dashboard/scores", icon: "✎" },
  { title: "Assessments", href: "/dashboard/assessment", icon: "▤" },
  { title: "Reports", href: "/dashboard/reports", icon: "▧" },
  { title: "Schools", href: "/dashboard/school", icon: "⌂" },
  
  { title: "Subjects", href: "/dashboard/subjects", icon: "▤" },
  {
    title: "My Profile",
    href: "/dashboard/profile",
    icon: "♙",
  },

];

const managementNavigation: NavigationItem[] = [
  { title: "Regions", href: "/dashboard/regions", icon: "⌖" },
  { title: "Counties", href: "/dashboard/counties", icon: "⌖" },
  { title: "Subcounties", href: "/dashboard/subcounty", icon: "⌖" },
  { title: "Zones", href: "/dashboard/zone", icon: "⌖" },
  { title: "Add User", href: "/dashboard/users", icon: "♙" },
];

// ==========================================
// HELPERS
// ==========================================

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

// ==========================================
// NAVIGATION LINK
// ==========================================

function NavigationLink({
  item,
  pathname,
  collapsed = false,
  onNavigate,
}: {
  item: NavigationItem;
  pathname: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const active = isActiveRoute(pathname, item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.title : undefined}
      className={`group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
        active
          ? "bg-indigo-50 text-indigo-700"
          : "text-slate-600 hover:bg-slate-50 hover:text-indigo-700"
      } ${collapsed ? "lg:justify-center lg:px-2" : ""}`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-lg transition ${
          active
            ? "bg-indigo-100 text-indigo-700"
            : "text-slate-500 group-hover:bg-slate-100"
        }`}
      >
        {item.icon}
      </span>

      <span className={`truncate ${collapsed ? "lg:hidden" : ""}`}>
        {item.title}
      </span>

      {active && !collapsed && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600 lg:hidden" />
      )}
    </Link>
  );
}

// ==========================================
// NAVIGATION GROUP
// ==========================================

function NavigationGroup({
  title,
  items,
  pathname,
  expanded,
  onToggle,
  collapsed,
  onNavigate,
}: {
  title: string;
  items: NavigationItem[];
  pathname: string;
  expanded: boolean;
  onToggle: () => void;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const hasActiveItem = items.some((item) =>
    isActiveRoute(pathname, item.href)
  );

  return (
    <section className="space-y-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 transition hover:text-slate-700 ${
          collapsed ? "lg:justify-center lg:px-1" : ""
        }`}
        title={collapsed ? title : undefined}
      >
        <span className={collapsed ? "lg:hidden" : ""}>{title}</span>

        {!collapsed && (
          <span className="text-sm">
            {expanded ? "−" : "+"}
          </span>
        )}

        {collapsed && (
          <span className="hidden text-indigo-600 lg:inline">
            {hasActiveItem ? "•" : "···"}
          </span>
        )}
      </button>

      {expanded && (
        <nav className="space-y-1">
          {items.map((item) => (
            <NavigationLink
              key={item.href}
              item={item}
              pathname={pathname}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
      )}
    </section>
  );
}

// ==========================================
// MAIN NAVIGATION LAYOUT
// ==========================================

export default function NavigationLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  // USER
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  // SIDEBAR
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // NAVIGATION GROUPS
  const [mainExpanded, setMainExpanded] = useState(true);
  const [adminExpanded, setAdminExpanded] = useState(true);

  const isLoginPage = pathname === "/dashboard/login";
  const isRegisterPage = pathname === "/dashboard/register";
  const isAuthPage = isLoginPage || isRegisterPage;

  const isAdmin = user?.role === "ADMIN";

  const activePage = [
    ...navigation,
    ...(isAdmin ? managementNavigation : []),
  ].find((item) => isActiveRoute(pathname, item.href));

  const initials = user?.name?.trim().charAt(0).toUpperCase() || "U";

  // ========================================
  // FETCH USER PROFILE
  // ========================================

  useEffect(() => {
    let active = true;

    async function getProfile() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/profile", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (response.status === 401) {
          window.location.replace("/dashboard/login");
          return;
        }

        if (!response.ok) {
          throw new Error("Unable to load your profile.");
        }

        const result: { data: User } = await response.json();

        if (active) {
          setUser(result.data);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    if (isAuthPage) {
      setUser(null);
      setLoading(false);
      setError("");
    } else {
      getProfile();
    }

    return () => {
      active = false;
    };
  }, [isAuthPage]);

  // Close mobile sidebar after navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // ========================================
  // LOGOUT
  // ========================================

  async function logout() {
    try {
      setLoggingOut(true);

      const response = await fetch("/api/users/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Unable to sign out.");
      }

      setUser(null);
      window.location.replace("/dashboard/login");
    } catch (err) {
      console.error("Logout error:", err);
      setLoggingOut(false);
      alert("Logout failed. Please try again.");
    }
  }

  // ========================================
  // CONTEXT VALUE
  // ========================================

  const contextValue = { user, loading };

  // ========================================
  // AUTH PAGES
  // ========================================

  if (isAuthPage) {
    return (
      <UserContext.Provider value={contextValue}>
        {children}
      </UserContext.Provider>
    );
  }

  // ========================================
  // SIDEBAR CONTENT
  // ========================================

  function SidebarContent({ mobile = false }: { mobile?: boolean }) {
    const collapsed = mobile ? false : sidebarCollapsed;

    function closeMobile() {
      if (mobile) setMobileOpen(false);
    }

    return (
      <>
        {/* BRAND */}
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-100 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">
              E
            </div>

            <div className={collapsed ? "lg:hidden" : ""}>
              <h1 className="whitespace-nowrap font-bold tracking-tight text-slate-900">
                Exam Management
              </h1>

              <p className="text-xs text-slate-400">
                CBE Examination System
              </p>
            </div>
          </div>

          {/* MOBILE CLOSE */}
          {mobile && (
            <button
              type="button"
              onClick={closeMobile}
              aria-label="Close navigation"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-xl text-slate-500 hover:bg-slate-100 lg:hidden"
            >
              ×
            </button>
          )}

          {/* DESKTOP COLLAPSE */}
          {!mobile && (
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              aria-label={
                sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"
              }
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg text-slate-500 hover:bg-slate-100 hover:text-indigo-600 lg:flex"
            >
              {sidebarCollapsed ? "→" : "←"}
            </button>
          )}
        </div>

        {/* LINKS */}
        <div className="flex-1 space-y-7 overflow-y-auto px-3 py-6">
          <NavigationGroup
            title="Main Menu"
            items={navigation}
            pathname={pathname}
            expanded={mainExpanded}
            onToggle={() => setMainExpanded(!mainExpanded)}
            collapsed={collapsed}
            onNavigate={closeMobile}
          />

          {isAdmin && (
            <NavigationGroup
              title="Administration"
              items={managementNavigation}
              pathname={pathname}
              expanded={adminExpanded}
              onToggle={() => setAdminExpanded(!adminExpanded)}
              collapsed={collapsed}
              onNavigate={closeMobile}
            />
          )}

          {/* SYSTEM INFORMATION */}
          {!collapsed && (
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">
                SYSTEM INFORMATION
              </p>

              <p className="mt-2 text-sm font-semibold text-slate-800">
                Competency Based Education
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Examination registration, assessment and performance
                management.
              </p>
            </div>
          )}
        </div>

        {/* USER PROFILE */}
        <div className="shrink-0 border-t border-slate-100 p-4">
          <div
            className={`flex items-center gap-3 ${
              collapsed ? "lg:justify-center" : ""
            }`}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-bold text-indigo-700">
              {initials}
            </div>

            <div className={`min-w-0 flex-1 ${collapsed ? "lg:hidden" : ""}`}>
              <p className="truncate text-sm font-semibold text-slate-800">
                {user?.name || (loading ? "Loading profile..." : "User")}
              </p>

              <p className="text-xs text-slate-400">
                {user?.role || ""}
              </p>
            </div>
          </div>

          {/* MOBILE SIGN OUT */}
          {mobile && (
            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className="mt-4 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              {loggingOut ? "Signing out..." : "Sign out"}
            </button>
          )}
        </div>
      </>
    );
  }

  // ========================================
  // RENDER
  // ========================================

  return (
    <UserContext.Provider value={contextValue}>
      <div className="min-h-screen bg-slate-50 text-slate-800">

        {/* =================================
            MOBILE OVERLAY
        ================================= */}

        {mobileOpen && (
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setMobileOpen(false)}
            className="print:hidden fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
          />
        )}

        {/* =================================
            SIDEBAR
        ================================= */}

        <aside
          className={`print:hidden fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200 bg-white shadow-xl transition-all duration-300 ease-in-out lg:shadow-none ${
            mobileOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          } ${
            sidebarCollapsed
              ? "lg:w-20"
              : "lg:w-64"
          }`}
        >
          {/* MOBILE SIDEBAR */}
          <div className="flex h-full flex-col lg:hidden">
            <SidebarContent mobile />
          </div>

          {/* DESKTOP SIDEBAR */}
          <div className="hidden h-full flex-col lg:flex">
            <SidebarContent />
          </div>
        </aside>

        {/* =================================
            MAIN APPLICATION
        ================================= */}

        <div
          className={`min-h-screen transition-all duration-300 ${
            sidebarCollapsed ? "lg:pl-20" : "lg:pl-64"
          }`}
        >
          {/* HEADER */}
          <header className="print:hidden sticky top-0 z-30 flex min-h-[4.5rem] items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur sm:px-5 md:px-8">

            {/* LEFT HEADER */}
            <div className="flex min-w-0 items-center gap-3">

              {/* MOBILE MENU BUTTON */}
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
                aria-expanded={mobileOpen}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-xl text-slate-600 transition hover:bg-slate-50 lg:hidden"
              >
                ☰
              </button>

              <div className="min-w-0">
                <p className="hidden text-[10px] font-semibold tracking-[0.15em] text-slate-400 sm:block">
                  EXAMINATION MANAGEMENT
                </p>

                <h2 className="truncate text-base font-bold text-slate-800 sm:text-lg">
                  {activePage?.title || "Dashboard"}
                </h2>
              </div>
            </div>

            {/* RIGHT HEADER */}
            <div className="flex shrink-0 items-center gap-2 sm:gap-4">

              {/* USER DETAILS */}
              <div className="hidden text-right sm:block">
                <p className="max-w-40 truncate text-sm font-semibold text-slate-800">
                  {user?.name || (loading ? "Loading..." : "User")}
                </p>

                <p className="max-w-40 truncate text-xs text-slate-400">
                  {user?.school?.name || user?.role || ""}
                </p>
              </div>

              {/* AVATAR */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700 sm:h-10 sm:w-10">
                {initials}
              </div>

              {/* DESKTOP SIGN OUT */}
              <button
                type="button"
                onClick={logout}
                disabled={loggingOut}
                className="hidden rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 sm:block"
              >
                {loggingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </header>

          {/* =================================
              PAGE CONTENT
          ================================= */}

          <main className="mx-auto min-h-[calc(100vh-4.5rem)] max-w-7xl space-y-6 px-3 py-5 sm:px-5 md:space-y-8 md:px-8 md:py-8">

            {/* ERROR MESSAGE */}
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {/* DYNAMIC PAGE */}
            {children}

            {/* FOOTER */}
            <footer className="print:hidden border-t border-slate-200 pt-5 text-center text-xs text-slate-400">
              Examination Management System
            </footer>
          </main>
        </div>
      </div>
    </UserContext.Provider>
  );
}