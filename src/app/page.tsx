"use client";

import Link from "next/link";
import { useCurrentUser } from "../components/NavigationalLayout";

const quickActions = [
  {
    title: "Register Candidates",
    description: "Register learners for an examination.",
    href: "/dashboard/student",
    icon: "👨‍🎓",
  },
  {
    title: "Enter Examination Marks",
    description: "Record and manage candidate scores.",
    href: "/dashboard/scores",
    icon: "📝",
  },
  {
    title: "Manage Assessments",
    description: "Create and manage examination periods.",
    href: "/dashboard/assessment",
    icon: "📋",
  },
  {
    title: "Examination Results",
    description: "View performance and examination results.",
    href: "/dashboard/results",
    icon: "📊",
  },
];

export default function DashboardPage() {
  const { user, loading } = useCurrentUser();

  const initials =
    user?.name
      ?.trim()
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .join("")
      .slice(0, 2)
      .toUpperCase() || "B";

  if (loading) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <p className="mt-3 text-sm text-slate-500">
            Loading dashboard...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Welcome section */}
        <section className="overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-700 to-blue-600 p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium text-indigo-100">
                Examination Management System
              </p>

              <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
                Welcome back, {user?.name || "User"}
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-100 sm:text-base">
                Manage candidates, assessments, examination marks and
                performance reports from your dashboard.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/dashboard/student"
                  className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
                >
                  Register Candidates
                </Link>

                <Link
                  href="/dashboard/scores"
                  className="rounded-lg border border-white/40 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Enter Marks
                </Link>
              </div>
            </div>

            {/* Clickable profile avatar */}
            <div className="flex items-center gap-3 self-start rounded-xl border border-white/20 bg-white/10 p-3 sm:self-center">
              <Link
                href="/dashboard/profile"
                aria-label="Open my profile"
                title="My Profile"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-lg font-bold text-indigo-700 shadow-sm transition hover:scale-105 hover:bg-indigo-50 focus:outline-none focus:ring-4 focus:ring-white/40"
              >
                {initials}
              </Link>

              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {user?.name || "User"}
                </p>
                <p className="text-sm text-indigo-100">
                  {user?.role || "Account"}
                </p>

                <Link
                  href="/dashboard/profile"
                  className="mt-1 inline-block text-xs font-medium text-white underline underline-offset-2 hover:text-indigo-100"
                >
                  View profile
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Account overview */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-800">
              Account Overview
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Your current account and institution information.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Current School
              </p>
              <h3 className="mt-2 text-lg font-bold text-slate-800">
                {user?.school?.name || "Not assigned"}
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Your registered institution
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">
                Account Role
              </p>
              <h3 className="mt-2 text-lg font-bold capitalize text-slate-800">
                {user?.role?.toLowerCase() || "User"}
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Your system access level
              </p>
            </div>

            <Link
              href="/dashboard/profile"
              className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">
                  My Account
                </p>
                <span className="text-indigo-600 transition group-hover:translate-x-1">
                  →
                </span>
              </div>

              <h3 className="mt-2 text-lg font-bold text-slate-800">
                View Profile
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                View your personal and account information
              </p>
            </Link>
          </div>
        </section>

        {/* Quick actions */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-800">
              Quick Actions
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Access commonly used system functions.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-xl">
                  {action.icon}
                </div>

                <h3 className="mt-4 font-semibold text-slate-800 transition group-hover:text-indigo-700">
                  {action.title}
                </h3>

                <p className="mt-2 text-sm leading-5 text-slate-500">
                  {action.description}
                </p>

                <div className="mt-4 text-sm font-semibold text-indigo-600">
                  Open <span aria-hidden="true">→</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* System information */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-slate-800">
            Examination Management
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            This system supports the management of interschool examinations,
            candidate registration, subject marks entry, results processing
            and performance reporting across participating schools.
          </p>
        </section>
      </div>
    </main>
  );
}