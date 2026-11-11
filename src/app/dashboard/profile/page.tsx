"use client";

import Link from "next/link";
import { useCurrentUser } from "../../../components/NavigationalLayout";

// ==========================================
// HELPERS
// ==========================================

function getInitials(name?: string) {
  if (!name?.trim()) return "U";

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function formatRole(role?: string) {
  if (!role) return "Unknown";

  return role
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// ==========================================
// PROFILE PAGE
// ==========================================

export default function ProfilePage() {
  const { user, loading } = useCurrentUser();

  // ----------------------------------------
  // LOADING STATE
  // ----------------------------------------

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          Loading your profile...
        </div>
      </div>
    );
  }

  // ----------------------------------------
  // EMPTY STATE
  // ----------------------------------------

  if (!user) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
          ♙
        </div>

        <h2 className="mt-4 font-bold text-slate-800">
          Profile unavailable
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          We couldn't retrieve your account information.
        </p>

        <Link
          href="/"
          className="mt-5 inline-flex rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // ----------------------------------------
  // PROFILE DATA
  // ----------------------------------------

  const initials = getInitials(user.name);
  const role = formatRole(user.role);

  return (
    <div className="space-y-7">

      {/* ==================================
          PAGE HEADING
      ================================== */}

      <section>
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-indigo-600">
          Account management
        </p>

        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              My Profile
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              View your personal and institutional account information.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <span>←</span>
            Dashboard
          </Link>
        </div>
      </section>

      {/* ==================================
          PROFILE HEADER
      ================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* COVER */}
        <div className="relative h-28 overflow-hidden bg-gradient-to-r from-indigo-700 via-blue-700 to-blue-600 sm:h-36">
          <div className="absolute -right-10 -top-24 h-64 w-64 rounded-full border-[30px] border-white/10" />
          <div className="absolute -bottom-32 right-1/3 h-64 w-64 rounded-full border-[30px] border-white/10" />
        </div>

        {/* PROFILE INFORMATION */}
        <div className="px-5 pb-6 sm:px-8">

          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">

            {/* AVATAR AND NAME */}
            <div className="flex flex-wrap items-end gap-4">

              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-indigo-100 text-3xl font-bold text-indigo-700 shadow-sm sm:h-28 sm:w-28 sm:text-4xl">
                {initials}
              </div>

              <div className="min-w-0 pb-1">
                <h2 className="break-words text-xl font-bold text-slate-900 sm:text-2xl">
                  {user.name}
                </h2>

                <p className="mt-1 break-all text-sm text-slate-500">
                  {user.email}
                </p>
              </div>
            </div>

            {/* ROLE */}
            <div className="pb-1">
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700">
                <span className="h-2 w-2 rounded-full bg-indigo-600" />
                {role}
              </span>
            </div>

          </div>
        </div>
      </section>

      {/* ==================================
          ACCOUNT INFORMATION
      ================================== */}

      <section>

        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-800">
            Personal Information
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Your registered account details.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">

          {/* FULL NAME */}
          <ProfileField
            label="Full Name"
            value={user.name}
            icon="♙"
          />

          {/* EMAIL */}
          <ProfileField
            label="Email Address"
            value={user.email}
            icon="✉"
          />

          {/* ACCOUNT ROLE */}
          <ProfileField
            label="Account Role"
            value={role}
            icon="▣"
          />

          {/* USER ID */}
          <ProfileField
            label="Account ID"
            value={user.id}
            icon="⌗"
            copyable
          />

        </div>
      </section>

      {/* ==================================
          INSTITUTION INFORMATION
      ================================== */}

      <section>

        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-800">
            Institutional Information
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Your institution's registration details.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

          <div className="flex items-start gap-4">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-700">
              ⌂
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Assigned School
              </p>

              <h3 className="mt-2 break-words text-lg font-bold text-slate-800">
                {user.school?.name || "No school assigned"}
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {user.school
                  ? "Your account is associated with this institution."
                  : "Your account currently has no associated institution."}
              </p>
            </div>

          </div>

          {user.school && (
            <div className="mt-5 border-t border-slate-100 pt-5">
              <p className="text-xs text-slate-400">
                SCHOOL IDENTIFIER
              </p>

              <p className="mt-2 break-all text-sm font-medium text-slate-700">
                {user.school.id}
              </p>
            </div>
          )}

        </div>
      </section>

      {/* ==================================
          ACCOUNT STATUS
      ================================== */}

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 sm:p-6">

        <div className="flex items-start gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            ✓
          </div>

          <div>
            <h3 className="font-bold text-slate-800">
              Account information loaded
            </h3>

            <p className="mt-1 text-sm leading-6 text-slate-600">
              Your profile information is currently being displayed
              from your authenticated account.
            </p>
          </div>

        </div>
      </section>

    </div>
  );
}

// ==========================================
// REUSABLE PROFILE FIELD
// ==========================================

function ProfileField({
  label,
  value,
  icon,
  copyable = false,
}: {
  label: string;
  value: string;
  icon: string;
  copyable?: boolean;
}) {
  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard access may be unavailable in some browsers.
    }
  }

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200">

      <div className="flex items-center justify-between gap-3">

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-lg text-slate-600">
            {icon}
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>
        </div>

        {copyable && (
          <button
            type="button"
            onClick={copyValue}
            title="Copy account ID"
            aria-label={`Copy ${label}`}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50"
          >
            Copy
          </button>
        )}

      </div>

      <p className="mt-4 break-all text-sm font-semibold text-slate-800">
        {value || "Not provided"}
      </p>

    </div>
  );
}