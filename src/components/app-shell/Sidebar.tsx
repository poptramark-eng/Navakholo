"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { navigationSections, type NavigationSection } from "@/lib/navigation";
import type { ShellUser } from "@/lib/api/profile";
import { ChevronDown, ChevronLeft, ChevronRight, CircleUserRound, LogOut, X } from "lucide-react";

type SidebarProps = {
  user: ShellUser | null;
  collapsed: boolean;
  mobile?: boolean;
  loggingOut: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  onLogout: () => void;
};

function isCurrentPage(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar({
  user,
  collapsed,
  mobile = false,
  loggingOut,
  onToggle,
  onNavigate,
  onLogout,
}: SidebarProps) {
  const pathname = usePathname();
  const [closedSections, setClosedSections] = useState<string[]>([]);
  const sections: NavigationSection[] = navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        !item.permission || user?.permissions.includes(item.permission),
      ),
    }))
    .filter((section) => section.items.length > 0);
  const compact = collapsed && !mobile;
  const accountName = user?.name || user?.email || "Signed-in account";
  const initials = accountName
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "A";

  const toggleSection = (label: string) => {
    setClosedSections((current) => current.includes(label)
      ? current.filter((item) => item !== label)
      : [...current, label]);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className={`flex h-16 shrink-0 items-center border-b border-sidebar-border ${compact ? "justify-center px-2" : "justify-between px-4"}`}>
        <Link href="/" onClick={onNavigate} className="flex min-w-0 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Navakholo overview">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">N</span>
          {!compact && (
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-semibold tracking-tight">Navakholo</span>
              <span className="truncate text-[11px] text-muted-foreground">Assessment workspace</span>
            </span>
          )}
        </Link>
        {!mobile && !compact && (
          <Button type="button" variant="ghost" size="icon-sm" onClick={onToggle} aria-label="Collapse navigation">
            <ChevronLeft aria-hidden="true" />
          </Button>
        )}
        {!mobile && compact && (
          <Button type="button" variant="ghost" size="icon-sm" className="absolute left-14 top-3 bg-sidebar" onClick={onToggle} aria-label="Expand navigation">
            <ChevronRight aria-hidden="true" />
          </Button>
        )}
        {mobile && (
          <Button type="button" variant="ghost" size="icon" onClick={onNavigate} aria-label="Close navigation">
            <X aria-hidden="true" />
          </Button>
        )}
      </div>

      <nav aria-label="Primary navigation" className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
        <div className="flex flex-col gap-6">
          {sections.map((section) => {
            const isOpen = compact || !closedSections.includes(section.label);
            return (
              <div key={section.label} className="flex flex-col gap-1">
                {!compact && (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.label)}
                    aria-expanded={isOpen}
                    aria-controls={`navigation-section-${section.label.toLowerCase().replaceAll(" ", "-")}`}
                    className="flex min-h-8 items-center justify-between rounded-md px-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span>{section.label}</span>
                    <ChevronDown aria-hidden="true" className={`transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                  </button>
                )}
                {isOpen && (
                  <ul id={`navigation-section-${section.label.toLowerCase().replaceAll(" ", "-")}`} className="flex flex-col gap-1">
                    {section.items.map((item) => {
                      const active = isCurrentPage(pathname, item.href);
                      const Icon = item.icon;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={onNavigate}
                            aria-current={active ? "page" : undefined}
                            aria-label={compact ? item.label : undefined}
                            title={compact ? item.label : undefined}
                            className={`group flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${compact ? "justify-center px-2" : ""} ${active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
                          >
                            <Icon aria-hidden="true" className="size-4 shrink-0" />
                            {!compact && <span className="truncate">{item.label}</span>}
                            {active && !compact && <span aria-hidden="true" className="ml-auto size-1.5 rounded-full bg-primary" />}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      <div className={`shrink-0 border-t border-sidebar-border p-3 ${compact ? "flex flex-col items-center gap-2" : ""}`}>
        {!compact && (
          <div className="px-2 pb-2" title={user?.school?.name || "School scope not provided by profile"}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">School scope</p>
            <p className="mt-1 truncate text-xs font-medium">{user?.school?.name || "Not provided by profile"}</p>
          </div>
        )}
        <Link
          href="/dashboard/profile"
          onClick={onNavigate}
          aria-label={compact ? "Open personal profile" : undefined}
          title={compact ? "Personal profile" : undefined}
          className={`flex min-h-11 items-center gap-3 rounded-lg px-2 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring ${compact ? "justify-center" : ""}`}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground" aria-hidden="true">{initials}</span>
          {!compact && (
            <span className="flex min-w-0 flex-1 flex-col text-left">
              <span className="truncate text-xs font-semibold">{accountName}</span>
              <span className="truncate text-[11px] text-muted-foreground">Personal profile</span>
            </span>
          )}
          {!compact && <CircleUserRound aria-hidden="true" className="size-4 text-muted-foreground" />}
        </Link>
        {user && (
          <Button
            type="button"
            variant="ghost"
            size={compact ? "icon" : "sm"}
            className={compact ? "mt-1" : "mt-1 w-full justify-start text-muted-foreground"}
            onClick={onLogout}
            disabled={loggingOut}
            aria-label={compact ? "Sign out" : undefined}
            title={compact ? "Sign out" : undefined}
          >
            <LogOut aria-hidden="true" data-icon={compact ? undefined : "inline-start"} />
            {!compact && (loggingOut ? "Signing out…" : "Sign out")}
          </Button>
        )}
      </div>
    </div>
  );
}
