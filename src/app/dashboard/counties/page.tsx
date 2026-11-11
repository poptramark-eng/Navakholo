"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

type Region = {
  id: string;
  name: string;
};

type ApiResponse<T> = {
  count: number;
  data: T[];
};

export default function CountiesPage() {
  const router = useRouter();

  const [regions, setRegions] = useState<Region[]>([]);
  const [regionId, setRegionId] = useState("");
  const [countyName, setCountyName] = useState("");

  const [loadingRegions, setLoadingRegions] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  // ------------------------------------
  // LOAD REGIONS
  // ------------------------------------

  useEffect(() => {
    const controller = new AbortController();

    async function loadRegions() {
      try {
        setLoadingRegions(true);

        const response = await fetch("/api/regions", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load regions.");
        }

        const result: ApiResponse<Region> = await response.json();

        setRegions(result.data ?? []);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingRegions(false);
        }
      }
    }

    loadRegions();

    return () => controller.abort();
  }, []);

  // ------------------------------------
  // CREATE COUNTY
  // ------------------------------------

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    const name = countyName.trim();

    if (!regionId || !name) {
      setError("Please select a region and enter a county name.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/counties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          regionId,
        }),
      });

      const result: {
        message?: string;
        error?: string;
      } = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || result.message || "Failed to create county."
        );
      }

      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ------------------------------------
  // UI
  // ------------------------------------

  return (
    <main className="min-h-full bg-slate-50/70 px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-3xl space-y-8">

        {/* Page heading */}
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Location management
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Add a County
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Register a county and associate it with an existing region
            in your examination management system.
          </p>
        </header>

        {/* Form card */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="font-semibold text-slate-900">
              County information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Select the parent region and provide the county name.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 p-6">

            {/* Region selection */}
            <div className="space-y-2">
              <label
                htmlFor="regionId"
                className="block text-sm font-medium text-slate-700"
              >
                Parent region <span className="text-red-500">*</span>
              </label>

              <select
                id="regionId"
                name="regionId"
                value={regionId}
                onChange={(event) => setRegionId(event.target.value)}
                required
                disabled={loadingRegions || regions.length === 0}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">
                  {loadingRegions
                    ? "Loading regions..."
                    : regions.length === 0
                      ? "No regions available"
                      : "Select a region"}
                </option>

                {regions.map((region) => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>

              <p className="text-xs text-slate-400">
                The county will belong to the selected region.
              </p>
            </div>

            {/* County name */}
            <div className="space-y-2">
              <label
                htmlFor="county"
                className="block text-sm font-medium text-slate-700"
              >
                County name <span className="text-red-500">*</span>
              </label>

              <input
                type="text"
                id="county"
                name="county"
                value={countyName}
                onChange={(event) => setCountyName(event.target.value)}
                placeholder="Enter county name"
                maxLength={100}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />

              <p className="text-xs text-slate-400">
                Use the official county name.
              </p>
            </div>

            {/* Error feedback */}
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">

              <button
                type="button"
                onClick={() => router.back()}
                disabled={submitting}
                className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  submitting ||
                  loadingRegions ||
                  !regionId ||
                  !countyName.trim()
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Creating county...
                  </>
                ) : (
                  "Create County"
                )}
              </button>

            </div>
          </form>
        </section>

        {/* Hierarchy information */}
        <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600">
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
            >
              <circle cx="12" cy="12" r="9" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 11v5m0-8h.01"
              />
            </svg>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-indigo-900">
              Location hierarchy
            </h3>

            <p className="mt-1 text-sm leading-6 text-indigo-800/70">
              Region → County → Subcounty → Zone → Cluster → School.
              Each county must be associated with an existing region.
            </p>
          </div>
        </div>

      </div>
    </main>
  );
}