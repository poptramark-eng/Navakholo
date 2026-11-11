"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

type LocationItem = {
  id: string;
  name: string;
};

type ApiResponse<T> = {
  count: number;
  data: T[];
};

export default function ClusterPage() {
  const router = useRouter();

  // ------------------------------------
  // LOCATION DATA
  // ------------------------------------

  const [counties, setCounties] = useState<LocationItem[]>([]);
  const [subcounties, setSubcounties] = useState<LocationItem[]>([]);
  const [zones, setZones] = useState<LocationItem[]>([]);

  // ------------------------------------
  // SELECTIONS
  // ------------------------------------

  const [countyId, setCountyId] = useState("");
  const [subcountyId, setSubcountyId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [clusterName, setClusterName] = useState("");

  // ------------------------------------
  // LOADING STATES
  // ------------------------------------

  const [loadingCounties, setLoadingCounties] = useState(true);
  const [loadingSubcounties, setLoadingSubcounties] = useState(false);
  const [loadingZones, setLoadingZones] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  // ------------------------------------
  // LOAD COUNTIES
  // ------------------------------------

  useEffect(() => {
    const controller = new AbortController();

    async function loadCounties() {
      try {
        setLoadingCounties(true);

        const response = await fetch("/api/counties", {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load counties.");
        }

        const result: ApiResponse<LocationItem> = await response.json();

        setCounties(result.data ?? []);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingCounties(false);
        }
      }
    }

    loadCounties();

    return () => controller.abort();
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

        const result: ApiResponse<LocationItem> = await response.json();

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
  // LOAD ZONES
  // ------------------------------------

  useEffect(() => {
    if (!subcountyId) {
      setZones([]);
      return;
    }

    const controller = new AbortController();

    async function loadZones() {
      try {
        setLoadingZones(true);
        setZones([]);
        setError("");

        const response = await fetch(
          `/api/zones?subcountyId=${encodeURIComponent(subcountyId)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Failed to load zones.");
        }

        const result: ApiResponse<LocationItem> = await response.json();

        setZones(result.data ?? []);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingZones(false);
        }
      }
    }

    loadZones();

    return () => controller.abort();
  }, [subcountyId]);

  // ------------------------------------
  // CREATE CLUSTER
  // ------------------------------------

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    const name = clusterName.trim();

    if (!countyId || !subcountyId || !zoneId || !name) {
      setError("Please complete all fields before submitting.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/clusters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          zoneId,
        }),
      });

      const result: {
        message?: string;
        error?: string;
      } = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || result.message || "Failed to create cluster."
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
  // REUSABLE SELECT STYLING
  // ------------------------------------

  const selectClass =
    "w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

  // ------------------------------------
  // UI
  // ------------------------------------

  return (
    <main className="min-h-full bg-slate-50/70 px-4 py-8 md:px-8 md:py-12">
      <div className="mx-auto max-w-3xl space-y-8">

        {/* PAGE HEADER */}
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Location management
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Add a Cluster
          </h1>

          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Create a cluster and associate it with an existing zone.
            Select the geographical hierarchy to locate the correct zone.
          </p>
        </header>

        {/* FORM CARD */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="font-semibold text-slate-900">
              Cluster information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Select the location and enter the cluster name.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 p-6">

            {/* GEOGRAPHICAL LOCATION */}
            <div className="space-y-5">

              <div>
                <h3 className="text-sm font-semibold text-slate-800">
                  Geographical location
                </h3>

                <p className="mt-1 text-xs text-slate-400">
                  Select each location level in sequence.
                </p>
              </div>

              {/* COUNTY */}
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
                  required
                  disabled={loadingCounties}
                  onChange={(event) => {
                    setCountyId(event.target.value);
                    setSubcountyId("");
                    setZoneId("");
                    setSubcounties([]);
                    setZones([]);
                    setError("");
                  }}
                  className={selectClass}
                >
                  <option value="">
                    {loadingCounties
                      ? "Loading counties..."
                      : "Select a county"}
                  </option>

                  {counties.map((county) => (
                    <option key={county.id} value={county.id}>
                      {county.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* SUBCOUNTY */}
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
                  required
                  disabled={!countyId || loadingSubcounties}
                  onChange={(event) => {
                    setSubcountyId(event.target.value);
                    setZoneId("");
                    setZones([]);
                    setError("");
                  }}
                  className={selectClass}
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

              {/* ZONE */}
              <div className="space-y-2">
                <label
                  htmlFor="zoneId"
                  className="block text-sm font-medium text-slate-700"
                >
                  Zone <span className="text-red-500">*</span>
                </label>

                <select
                  id="zoneId"
                  name="zoneId"
                  value={zoneId}
                  required
                  disabled={!subcountyId || loadingZones}
                  onChange={(event) => {
                    setZoneId(event.target.value);
                    setError("");
                  }}
                  className={selectClass}
                >
                  <option value="">
                    {!subcountyId
                      ? "Select a subcounty first"
                      : loadingZones
                        ? "Loading zones..."
                        : "Select a zone"}
                  </option>

                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* CLUSTER DETAILS */}
            <div className="space-y-2 border-t border-slate-100 pt-6">
              <h3 className="text-sm font-semibold text-slate-800">
                Cluster details
              </h3>

              <label
                htmlFor="cluster"
                className="block text-sm font-medium text-slate-700"
              >
                Cluster name <span className="text-red-500">*</span>
              </label>

              <input
                type="text"
                id="cluster"
                name="cluster"
                value={clusterName}
                onChange={(event) => setClusterName(event.target.value)}
                placeholder="Enter cluster name"
                maxLength={100}
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />

              <p className="text-xs text-slate-400">
                Use the official name of the cluster.
              </p>
            </div>

            {/* ERROR */}
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {/* ACTIONS */}
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
                  loadingZones ||
                  !countyId ||
                  !subcountyId ||
                  !zoneId ||
                  !clusterName.trim()
                }
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {submitting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Creating cluster...
                  </>
                ) : (
                  "Create Cluster"
                )}
              </button>

            </div>
          </form>
        </section>

        {/* LOCATION HIERARCHY */}
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
              A cluster must belong to an existing zone.
            </p>
          </div>
        </div>

      </div>
    </main>
  );
}