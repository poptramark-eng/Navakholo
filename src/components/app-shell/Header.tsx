"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { getVisibleNavigationItems } from "@/lib/navigation";
import type { ShellUser } from "@/lib/api/profile";
import { ChevronDown, ChevronRight, LogOut, Menu, Search, UserRound, X } from "lucide-react";

type HeaderProps = {
  user: ShellUser | null;
  searchOpen: boolean;
  searchQuery: string;
  loggingOut: boolean;
  onSearchQueryChange: (value: string) => void;
  onSearchOpen: () => void;
  onSearchClose: () => void;
  onOpenMobile: () => void;
  onLogout: () => void;
};

const pageLabels: Record<string, string> = {
  "/": "Overview",
  "/dashboard": "Overview",
  "/dashboard/assessment": "Assessments",
  "/dashboard/student": "Candidates",
  "/dashboard/scores": "Marks entry",
  "/dashboard/reports": "Results",
  "/dashboard/school": "Schools",
  "/dashboard/profile": "Personal profile",
};

export default function Header({
  user,
  searchOpen,
  searchQuery,
  loggingOut,
  onSearchQueryChange,
  onSearchOpen,
  onSearchClose,
  onOpenMobile,
  onLogout,
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const mobileSearchRef = useRef<HTMLInputElement>(null);
  const desktopSearchRegion = useRef<HTMLDivElement>(null);
  const mobileSearchRegion = useRef<HTMLDivElement>(null);
  const destinations = useMemo(() => [
    ...getVisibleNavigationItems(user?.permissions),
    { label: "Personal profile", href: "/dashboard/profile", description: "View your personal profile.", icon: UserRound },
  ], [user?.permissions]);
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const matches = destinations.filter((destination) =>
    !normalizedQuery || destination.label.toLocaleLowerCase().includes(normalizedQuery),
  );
  const pageLabel = pageLabels[pathname]
    || Object.entries(pageLabels).find(([path]) => path !== "/" && pathname.startsWith(`${path}/`))?.[1]
    || pathname.split("/").filter(Boolean).at(-1)?.replaceAll("-", " ")
    || "Overview";

  useEffect(() => {
    if (!searchOpen) return;
    const focusSearch = window.matchMedia("(min-width: 768px)").matches
      ? desktopSearchRef.current
      : mobileSearchRef.current;
    focusSearch?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (desktopSearchRegion.current?.contains(target) || mobileSearchRegion.current?.contains(target)) return;
      onSearchClose();
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [onSearchClose, searchOpen]);

  useEffect(() => {
    const handleSearchShortcut = (event: KeyboardEvent) => {
      if (event.key === "Escape" && searchOpen) {
        onSearchClose();
        return;
      }
      const target = event.target;
      const isTyping = target instanceof HTMLElement
        && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (event.key !== "/" || isTyping || event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      if (!searchOpen) onSearchOpen();
      else if (window.matchMedia("(min-width: 768px)").matches) desktopSearchRef.current?.focus();
      else mobileSearchRef.current?.focus();
    };
    window.addEventListener("keydown", handleSearchShortcut);
    return () => window.removeEventListener("keydown", handleSearchShortcut);
  }, [onSearchClose, onSearchOpen, searchOpen]);

  const navigateToFirstMatch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (matches[0]) {
      router.push(matches[0].href);
      onSearchClose();
    }
  };

  const renderMatches = () => (
    <div className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-lg" role="region" aria-label="Search results">
      <p className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Available pages</p>
      {matches.length ? (
        <ul className="flex flex-col gap-1">
          {matches.map((destination) => {
            const Icon = destination.icon;
            return (
              <li key={destination.href}>
                <Link
                  href={destination.href}
                  onClick={onSearchClose}
                  className="flex items-start gap-3 rounded-lg px-2.5 py-2 text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="font-medium">{destination.label}</span>
                    <span className="text-xs text-muted-foreground">{destination.description}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-2.5 py-3 text-sm text-muted-foreground" aria-live="polite">No matching permitted pages.</p>
      )}
    </div>
  );

  const searchForm = (mobile = false) => (
    <form onSubmit={navigateToFirstMatch} role="search" className="relative">
      <InputGroup className="h-9 bg-background">
        <InputGroupInput
          ref={mobile ? mobileSearchRef : desktopSearchRef}
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          onFocus={onSearchOpen}
          placeholder="Search pages"
          aria-label="Search permitted pages"
          autoComplete="off"
        />
        <InputGroupAddon>
          <Search aria-hidden="true" />
        </InputGroupAddon>
        {!mobile && <InputGroupAddon align="inline-end"><InputGroupText>/</InputGroupText></InputGroupAddon>}
      </InputGroup>
      {searchOpen && renderMatches()}
    </form>
  );

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          id="mobile-menu-trigger"
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open navigation"
          aria-controls="mobile-navigation"
          onClick={onOpenMobile}
        >
          <Menu aria-hidden="true" />
        </Button>
        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-sm">
          <Link href="/" className="hidden shrink-0 text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:inline">
            Workspace
          </Link>
          <ChevronRight aria-hidden="true" className="hidden size-3.5 shrink-0 text-muted-foreground sm:block" />
          <span aria-current="page" className="truncate font-medium">{pageLabel}</span>
        </nav>
      </div>

      <div className="hidden min-w-0 flex-1 justify-center px-4 md:flex" ref={desktopSearchRegion}>
        <div className="w-full max-w-sm">{searchForm()}</div>
      </div>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        <span className="hidden max-w-48 flex-col border-r border-border pr-3 text-right lg:flex">
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Scope</span>
          <span className="truncate text-xs font-medium" title={user?.school?.name || "Not provided by profile"}>
            {user?.school?.name || "Not provided"}
          </span>
        </span>
        <div className="relative md:hidden" ref={mobileSearchRegion}>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={searchOpen ? "Close page search" : "Search pages"}
            aria-expanded={searchOpen}
            onClick={() => searchOpen ? onSearchClose() : onSearchOpen()}
          >
            {searchOpen ? <X aria-hidden="true" /> : <Search aria-hidden="true" />}
          </Button>
          {searchOpen && <div className="absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-2rem))]">{searchForm(true)}</div>}
        </div>
        <details className="group relative">
          <summary aria-label="Open account menu" className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-lg px-2 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
              {(user?.name || user?.email || "A").split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")}
            </span>
          <span className="hidden max-w-32 flex-col text-left sm:flex">
            <span className="truncate text-xs font-semibold">{user?.name || "Account"}</span>
            <span className="truncate text-[11px] text-muted-foreground">Account settings</span>
          </span>
          {user?.role && (
            <Badge variant="secondary" className="max-w-24 truncate px-1.5 py-0.5 text-[10px] font-medium sm:max-w-28">
              {user.role}
            </Badge>
          )}

            <ChevronDown aria-hidden="true" className="hidden size-4 text-muted-foreground sm:block" />
          </summary>
          <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl border border-border bg-popover p-2 text-popover-foreground shadow-lg">
            <div className="border-b border-border px-3 py-2.5">
              <p className="truncate text-sm font-semibold">{user?.name || user?.email || "Account"}</p>
              {user?.email && <p className="mt-0.5 truncate text-xs text-muted-foreground">{user.email}</p>}
              <p className="mt-2 text-xs text-muted-foreground">Account role: <span className="font-medium text-foreground">{user?.role || "Not provided"}</span></p>
            </div>
            <Link href="/dashboard/profile" onClick={onSearchClose} className="mt-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring">
              <UserRound aria-hidden="true" className="size-4" /> Personal profile
            </Link>
            {user && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-1 w-full justify-start text-muted-foreground"
                onClick={onLogout}
                disabled={loggingOut}
              >
                <LogOut aria-hidden="true" data-icon="inline-start" />
                {loggingOut ? "Signing out…" : "Sign out"}
              </Button>
            )}
          </div>
        </details>
      </div>
    </header>
  );
}
