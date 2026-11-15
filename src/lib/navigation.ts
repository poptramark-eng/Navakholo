import type { LucideIcon } from "lucide-react";
import {
  ChartNoAxesColumnIncreasing,
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  School,
  SquarePen,
} from "lucide-react";
import { hasPermission, permissions, type PermissionKey } from "./permissions";

export type NavigationItem = {
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
  permission?: PermissionKey;
};

export type NavigationSection = {
  label: string;
  items: NavigationItem[];
};

export const navigationSections: NavigationSection[] = [
  {
    label: "Workspace",
    items: [
      {
        label: "Overview",
        href: "/",
        description: "Your assessment workspace overview.",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Assessment operations",
    items: [
      {
        label: "Assessments",
        href: "/dashboard/assessment",
        description: "Open assessment records available to your account.",
        icon: ClipboardList,
        permission: permissions.assessmentCreate,
      },
      {
        label: "Marks entry",
        href: "/dashboard/scores",
        description: "Review marks entry tools available to your account.",
        icon: SquarePen,
        permission: permissions.marksRead,
      },
      {
        label: "Results",
        href: "/dashboard/reports",
        description: "Open result reports available to your account.",
        icon: ChartNoAxesColumnIncreasing,
        permission: permissions.resultsRead,
      },
    ],
  },
  {
    label: "Directory",
    items: [
      {
        label: "Candidates",
        href: "/dashboard/student",
        description: "Open candidate records available to your account.",
        icon: GraduationCap,
        permission: permissions.studentRead,
      },
      {
        label: "Schools",
        href: "/dashboard/school",
        description: "Open school records available to your account.",
        icon: School,
        permission: permissions.schoolRead,
      },
    ],
  },
];

export function getVisibleNavigationSections(
  granted: readonly string[] | undefined,
) {
  return navigationSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.permission || hasPermission(granted, item.permission),
      ),
    }))
    .filter((section) => section.items.length > 0);
}

export function getVisibleNavigationItems(
  granted: readonly string[] | undefined,
) {
  return getVisibleNavigationSections(granted).flatMap((section) => section.items);
}
