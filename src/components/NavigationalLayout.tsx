"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError, apiRequest } from "@/lib/api/client";
import { getCurrentProfile, type ShellUser } from "@/lib/api/profile";
import { AlertCircle, RotateCcw, X } from "lucide-react";
import Header from "@/components/app-shell/Header";
import Sidebar from "@/components/app-shell/Sidebar";

type AuthContextValue = {
  user: ShellUser | null;
  loading: boolean;
  profileError: string | null;
};

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true, profileError: null });

export function useCurrentUser() {
  return useContext(AuthContext);
}

function WorkspaceLoadingState() {
  return (
    <div aria-busy="true" className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-5 py-8 sm:px-6 lg:px-8">
      <span className="sr-only">Loading your workspace</span>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-60 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="flex min-h-56 flex-col gap-4 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <Skeleton className="size-10 rounded-xl" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NavigationalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = pathname === "/dashboard/login";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const mobileNavigationRef = useRef<HTMLElement>(null);
  const {
    data: user,
    error,
    isLoading,
    mutate,
  } = useSWR<ShellUser>(isAuthPage ? null : "/api/profile", () => getCurrentProfile(), {
    shouldRetryOnError: (requestError) => !(requestError instanceof ApiError && requestError.status === 401),
  });

  useEffect(() => {
    if (error instanceof ApiError && error.status === 401 && !isAuthPage) {
      router.replace("/dashboard/login");
    }
  }, [error, isAuthPage, router]);

  useEffect(() => {
    if (!mobileOpen) return;
    const dialog = mobileNavigationRef.current;
    dialog?.querySelector<HTMLElement>("button, a[href]")?.focus();

    const handleDialogKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleDialogKeydown);
    return () => {
      window.removeEventListener("keydown", handleDialogKeydown);
      document.getElementById("mobile-menu-trigger")?.focus();
    };
  }, [mobileOpen]);

  const openSearch = useCallback(() => setSearchOpen(true), []);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  const handleLogout = useCallback(async () => {
    setLogoutError("");
    setLoggingOut(true);
    try {
      await apiRequest<{ message: string }>("/api/users/logout", { method: "POST" });
      await mutate(undefined, { revalidate: false });
      router.replace("/dashboard/login");
    } catch (logoutRequestError) {
      setLogoutError(logoutRequestError instanceof Error ? logoutRequestError.message : "Unable to sign out. Please try again.");
      setLoggingOut(false);
    }
  }, [mutate, router]);

  const profileError = error instanceof Error ? error.message : "Your account could not be loaded.";
  const profileErrorStatus = error instanceof ApiError ? error.status : undefined;
  const showProfileError = !isAuthPage && Boolean(error) && profileErrorStatus !== 401;

  return (
    <AuthContext.Provider value={{ user: user ?? null, loading: isLoading && !isAuthPage, profileError }}>
      {isAuthPage ? children : (
        <div className="min-h-screen bg-background text-foreground">
          <a href="#main-content" className="sr-only z-50 rounded-md bg-background px-4 py-2 text-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:ring-2 focus:ring-ring">
            Skip to main content
          </a>
          <div className="flex min-h-screen">
            <aside className={`sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border transition-[width] duration-200 md:block ${collapsed ? "w-[72px]" : "w-[256px]"}`} aria-label="Desktop navigation">
              <Sidebar
                user={user ?? null}
                collapsed={collapsed}
                onToggle={() => setCollapsed((current) => !current)}
                onLogout={handleLogout}
                loggingOut={loggingOut}
              />
            </aside>

            <div className="flex min-h-screen min-w-0 flex-1 flex-col">
              <Header
                user={user ?? null}
                searchOpen={searchOpen}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                onSearchOpen={openSearch}
                onSearchClose={closeSearch}
                onOpenMobile={() => setMobileOpen(true)}
                onLogout={handleLogout}
                loggingOut={loggingOut}
              />

              <main id="main-content" className="min-w-0 flex-1">
                {(showProfileError || logoutError) && (
                  <div className="mx-auto w-full max-w-7xl px-5 pt-5 sm:px-6 lg:px-8">
                    <Alert variant="destructive">
                      <AlertCircle aria-hidden="true" />
                      <AlertTitle>{logoutError ? "Sign out failed" : "Workspace unavailable"}</AlertTitle>
                      <AlertDescription>{logoutError || (error instanceof Error ? error.message : "Your account could not be loaded.")}</AlertDescription>
                      <AlertAction>
                        {showProfileError ? (
                          <Button type="button" variant="outline" size="sm" onClick={() => void mutate()}>
                            <RotateCcw aria-hidden="true" data-icon="inline-start" />
                            Retry
                          </Button>
                        ) : (
                          <Button type="button" variant="ghost" size="icon-sm" onClick={() => setLogoutError("")} aria-label="Dismiss message">
                            <X aria-hidden="true" />
                          </Button>
                        )}
                      </AlertAction>
                    </Alert>
                  </div>
                )}
                {isLoading && !isAuthPage ? <WorkspaceLoadingState /> : children}
              </main>
            </div>
          </div>

          {mobileOpen && (
            <div className="fixed inset-0 z-50 md:hidden">
              <button type="button" className="absolute inset-0 bg-foreground/40" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
              <aside
                ref={mobileNavigationRef}
                id="mobile-navigation"
                role="dialog"
                aria-modal="true"
                aria-label="Mobile navigation"
                className="absolute inset-y-0 left-0 w-[min(19rem,calc(100vw-2.5rem))] border-r border-sidebar-border bg-sidebar shadow-xl"
              >
                <Sidebar
                  user={user ?? null}
                  collapsed={false}
                  mobile
                  onToggle={() => undefined}
                  onNavigate={() => setMobileOpen(false)}
                  onLogout={handleLogout}
                  loggingOut={loggingOut}
                />
              </aside>
            </div>
          )}
        </div>
      )}
    </AuthContext.Provider>
  );
}
