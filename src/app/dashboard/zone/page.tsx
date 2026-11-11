"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

type County = {
  id: string;
  name: string;
};

type Subcounty = {
  id: string;
  name: string;
  countyId: string;
};

type ApiResponse<T> = {
  count: number;
  data: T[];
};

export default function CountiesPage() {
  const router = useRouter();

  const [counties, setCounties] = useState<County[]>([]);
  const [subcounties, setSubcounties] = useState<Subcounty[]>([]);

  const [countyId, setCountyId] = useState("");
  const [subcountyId, setSubcountyId] = useState("");
  const [zoneName, setZoneName] = useState("");

  const [loadingCounties, setLoadingCounties] = useState(true);
  const [loadingSubcounties, setLoadingSubcounties] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ------------------------------------
  // LOAD COUNTIES
  // ------------------------------------

  useEffect(() => {
    async function loadCounties() {
      try {
        setLoadingCounties(true);

        const response = await fetch("/api/counties");

        if (!response.ok) {
          throw new Error("Failed to load counties.");
        }

        const result: ApiResponse<County> = await response.json();

        setCounties(result.data ?? []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load counties."
        );
      } finally {
        setLoadingCounties(false);
      }
    }

    loadCounties();
  }, []);

  // ------------------------------------
  // LOAD SUBCOUNTIES
  // ------------------------------------

  useEffect(() => {
    if (!countyId) {
      setSubcounties([]);
      return;
    }

    const controller = new AbortController();

    async function loadSubcounties() {
      try {
        setLoadingSubcounties(true);
        setSubcounties([]);
        setError("");

        const response = await fetch(
          `/api/subcounties?countyId=${encodeURIComponent(countyId)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Failed to load subcounties.");
        }

        const result: ApiResponse<Subcounty> = await response.json();

        setSubcounties(result.data ?? []);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingSubcounties(false);
        }
      }
    }

    loadSubcounties();

    return () => controller.abort();
  }, [countyId]);

  // ------------------------------------
  // CREATE ZONE
  // ------------------------------------

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!countyId || !subcountyId || !zoneName.trim()) {
      setError("Please complete all fields.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/zones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: zoneName.trim(),
          subcountyId,
        }),
      });

      const result: { message?: string; error?: string } =
        await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || "Failed to create zone.");
      }

      setSuccess(result.message || "Zone created successfully.");

      setZoneName("");
      setSubcountyId("");

      // Navigate after successful creation.
      router.push("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
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
            Add a Zone
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Create a new zone by selecting its county and subcounty.
            The zone will be associated with the selected subcounty.
          </p>
        </header>

        {/* Form card */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="font-semibold text-slate-900">
              Zone information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Enter the location details below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 p-6">

            {/* County */}
            <div className="space-y-2">
              <label
                htmlFor="countyId"
                className="block text-sm font-medium text-slate-700"
              >
                County <span className="text-red-500">*</span>
              </label>

              <select
                id="countyId"
                name="countyId"
                value={countyId}
                onChange={(event) => {
                  setCountyId(event.target.value);
                  setSubcountyId("");
                  setError("");
                }}
                required
                disabled={loadingCounties}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="">
                  {loadingCounties ? "Loading counties..." : "Select a county"}
                </option>

                {counties.map((county) => (
                  <option key={county.id} value={county.id}>
                    {county.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subcounty */}
            <div className="space-y-2">
              <label
                htmlFor="subcountyId"
                className="block text-sm font-medium text-slate-700"
              >
                Subcounty <span className="text-red-500">*</span>
              </label>

              <select
                id="subcountyId"
                name="subcountyId"
                value={subcountyId}
                onChange={(event) => setSubcountyId(event.target.value)}
                required
                disabled={!countyId || loadingSubcounties}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">
                  {!countyId
                    ? "Select a county first"
                    : loadingSubcounties
                      ? "Loading subcounties..."
                      : "Select a subcounty"}
                </option>

                {subcounties.map((subcounty) => (
                  <option key={subcounty.id} value={subcounty.id}>
                    {subcounty.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Zone name */}
            <div className="space-y-2">
              <label
                htmlFor="zone"
                className="block text-sm font-medium text-slate-700"
              >
                Zone name <span className="text-red-500">*</span>
              </label>

              <input
                type="text"
                id="zone"
                name="zone"
                value={zoneName}
                onChange={(event) => setZoneName(event.target.value)}
                placeholder="Enter zone name"
                required
                maxLength={100}
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />

              <p className="text-xs text-slate-400">
                Use the official name of the zone.
              </p>
            </div>

            {/* Feedback */}
            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
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
                  loadingCounties ||
                  loadingSubcounties ||
                  !countyId ||
                  !subcountyId ||
                  !zoneName.trim()
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Creating zone...
                  </>
                ) : (
                  "Create Zone"
                )}
              </button>

            </div>
          </form>
        </section>

        {/* Hierarchy hint */}
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
              Selecting a county filters the available subcounties.
            </p>
          </div>
        </div>

      </div>
    </main>
  );
}