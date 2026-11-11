
"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const router = useRouter();

  // ------------------------------------
  // STATE
  // ------------------------------------

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ------------------------------------
  // FORM SUBMISSION
  // ------------------------------------

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (loading) return;

    setError("");

    const form = event.currentTarget;
    const credentials = new FormData(form);

    const payload = {
      email: String(credentials.get("email") || "")
        .trim()
        .toLowerCase(),

      password: String(
        credentials.get("password") || ""
      ),
    };

    if (!payload.email || !payload.password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const request = await fetch("/api/users/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const response: {
        message?: string;
        error?: string;
      } = await request.json();

      if (!request.ok) {
        throw new Error(
          response.error ||
          response.message ||
          "Invalid email or password."
        );
      }

      if (response.message !== "logged in succesfully") {
        throw new Error(
          response.message || "Unable to sign in."
        );
      }

      // JWT cookie is expected to be set by the API.
      router.replace("/");
      router.refresh();

    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------
  // UI
  // ------------------------------------

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">

      <div className="w-full max-w-md">

        {/* BRAND */}

        <header className="mb-8 text-center">

          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">

            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="h-8 w-8"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"
              />
            </svg>

          </div>

          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
            Examination Management
          </p>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Welcome Back
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Sign in to access your examination management portal.
          </p>

        </header>

        {/* LOGIN CARD */}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">

          <div className="border-b border-slate-100 px-6 py-5 sm:px-8">

            <h2 className="text-lg font-bold text-slate-800">
              Sign In
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Enter your account credentials below.
            </p>

          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5 p-6 sm:p-8"
          >

            {/* EMAIL */}

            <div>

              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email Address
              </label>

              <div className="relative">

                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                    stroke="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5A2.25 2.25 0 0 1 19.5 19.5h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15A2.25 2.25 0 0 0 2.25 6.75m19.5 0-9.75 6.75L2.25 6.75"
                    />
                  </svg>

                </span>

                <input
                  type="email"
                  name="email"
                  id="email"
                  autoComplete="username"
                  required
                  disabled={loading}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                />

              </div>

            </div>

            {/* PASSWORD */}

            <div>

              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Password
              </label>

              <div className="relative">

                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                    stroke="currentColor"
                    className="h-5 w-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 0 0-9 0v3.75m-.75 0h10.5A2.25 2.25 0 0 1 19.5 12.75v6A2.25 2.25 0 0 1 17.25 21h-10.5A2.25 2.25 0 0 1 4.5 18.75v-6A2.25 2.25 0 0 1 6.75 10.5Z"
                    />
                  </svg>

                </span>

                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  id="password"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-12 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  disabled={loading}
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="absolute inset-y-0 right-3 flex items-center text-slate-400 transition hover:text-slate-700"
                >

                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.8}
                      stroke="currentColor"
                      className="h-5 w-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.22A10.45 10.45 0 0 0 1.5 12s3.75 7.5 10.5 7.5c1.8 0 3.4-.48 4.77-1.24M6.23 6.23A10.45 10.45 0 0 1 12 4.5c6.75 0 10.5 7.5 10.5 7.5a10.5 10.5 0 0 1-3.02 3.78M9.88 9.88a3 3 0 0 0 4.24 4.24M3 3l18 18"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.8}
                      stroke="currentColor"
                      className="h-5 w-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.25 12s3.75-7.5 9.75-7.5 9.75 7.5 9.75 7.5-3.75 7.5-9.75 7.5S2.25 12 2.25 12Z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                      />
                    </svg>
                  )}

                </button>

              </div>

            </div>

            {/* ERROR */}

            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >

                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                  className="mt-0.5 h-5 w-5 shrink-0"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m0 3h.008M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  />
                </svg>

                <p>{error}</p>

              </div>
            )}

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >

              {loading && (
                <svg
                  className="h-5 w-5 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />

                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 0 1 8-8V0C5.37 0 0 5.37 0 12h4Z"
                  />
                </svg>
              )}

              {loading ? "Signing in..." : "Sign In"}

            </button>

          </form>

          {/* REGISTER */}

          <div className="border-t border-slate-100 px-6 py-5 text-center sm:px-8">

            <p className="text-sm text-slate-500">
              Don't have an account?
            </p>

            <button
              type="button"
              disabled={loading}
              onClick={() => router.push("/dashboard/register")}
              className="mt-2 text-sm font-bold text-blue-600 transition hover:text-blue-800 disabled:opacity-50"
            >
              Create an Account
            </button>

          </div>

        </section>

        {/* FOOTER */}

        <footer className="mt-7 text-center">

          <p className="text-xs text-slate-400">
            Examination Management System
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Secure institutional access
          </p>

        </footer>

      </div>

    </main>
  );
}
