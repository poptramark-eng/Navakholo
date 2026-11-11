"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

// ---------------------------------------------
// TYPES
// ---------------------------------------------

type NamedEntity = {
  id: string;
  name: string;
};

type ApiResponse<T> = {
  count: number;
  data: T[];
};

type LocationLevel = "counties" | "subcounties" | "zones" | "clusters";

type LocationState = {
  data: NamedEntity[];
  loading: boolean;
  error: string;
};

// ---------------------------------------------
// STYLES
// ---------------------------------------------

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

const labelClass = "mb-2 block text-sm font-semibold text-slate-700";

// ---------------------------------------------
// PAGE
// ---------------------------------------------

export default function AddSchoolPage() {
  const router = useRouter();

  // Selected locations
  const [countyId, setCountyId] = useState("");
  const [subcountyId, setSubcountyId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [clusterId, setClusterId] = useState("");

  // Location data
  const [counties, setCounties] = useState<LocationState>({
    data: [],
    loading: true,
    error: "",
  });

  const [subcounties, setSubcounties] = useState<LocationState>({
    data: [],
    loading: false,
    error: "",
  });

  const [zones, setZones] = useState<LocationState>({
    data: [],
    loading: false,
    error: "",
  });

  const [clusters, setClusters] = useState<LocationState>({
    data: [],
    loading: false,
    error: "",
  });

  // Form state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // -------------------------------------------
  // FETCH HELPER
  // -------------------------------------------

  async function fetchLocations(
    url: string,
    signal: AbortSignal
  ): Promise<NamedEntity[]> {
    const response = await fetch(url, {
      method: "GET",
      signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Unable to load location data.");
    }

    const result: ApiResponse<NamedEntity> = await response.json();

    return result.data ?? [];
  }

  // -------------------------------------------
  // LOAD COUNTIES
  // -------------------------------------------

  useEffect(() => {
    const controller = new AbortController();

    async function loadCounties() {
      setCounties({
        data: [],
        loading: true,
        error: "",
      });

      try {
        const data = await fetchLocations(
          "/api/counties",
          controller.signal
        );

        setCounties({
          data,
          loading: false,
          error: "",
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          setCounties({
            data: [],
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Unable to load counties.",
          });
        }
      }
    }

    loadCounties();

    return () => controller.abort();
  }, []);

  // -------------------------------------------
  // LOAD SUBCOUNTIES
  // -------------------------------------------

  useEffect(() => {
    setSubcountyId("");
    setZoneId("");
    setClusterId("");

    setSubcounties({
      data: [],
      loading: Boolean(countyId),
      error: "",
    });

    setZones({
      data: [],
      loading: false,
      error: "",
    });

    setClusters({
      data: [],
      loading: false,
      error: "",
    });

    if (!countyId) return;

    const controller = new AbortController();

    async function loadSubcounties() {
      try {
        const data = await fetchLocations(
          `/api/subcounties?countyId=${encodeURIComponent(countyId)}`,
          controller.signal
        );

        setSubcounties({
          data,
          loading: false,
          error: "",
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          setSubcounties({
            data: [],
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Unable to load subcounties.",
          });
        }
      }
    }

    loadSubcounties();

    return () => controller.abort();
  }, [countyId]);

  // -------------------------------------------
  // LOAD ZONES
  // -------------------------------------------

  useEffect(() => {
    setZoneId("");
    setClusterId("");

    setZones({
      data: [],
      loading: Boolean(subcountyId),
      error: "",
    });

    setClusters({
      data: [],
      loading: false,
      error: "",
    });

    if (!subcountyId) return;

    const controller = new AbortController();

    async function loadZones() {
      try {
        const data = await fetchLocations(
          `/api/zones?subcountyId=${encodeURIComponent(subcountyId)}`,
          controller.signal
        );

        setZones({
          data,
          loading: false,
          error: "",
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          setZones({
            data: [],
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Unable to load zones.",
          });
        }
      }
    }

    loadZones();

    return () => controller.abort();
  }, [subcountyId]);

  // -------------------------------------------
  // LOAD CLUSTERS
  // -------------------------------------------

  useEffect(() => {
    setClusterId("");

    setClusters({
      data: [],
      loading: Boolean(zoneId),
      error: "",
    });

    if (!zoneId) return;

    const controller = new AbortController();

    async function loadClusters() {
      try {
        const data = await fetchLocations(
          `/api/clusters?zoneId=${encodeURIComponent(zoneId)}`,
          controller.signal
        );

        setClusters({
          data,
          loading: false,
          error: "",
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          setClusters({
            data: [],
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Unable to load clusters.",
          });
        }
      }
    }

    loadClusters();

    return () => controller.abort();
  }, [zoneId]);

  // -------------------------------------------
  // SUBMIT SCHOOL
  // -------------------------------------------

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    const form = new FormData(event.currentTarget);
    const name = String(form.get("school") ?? "").trim();

    if (!name || !clusterId) {
      setError("Please provide a school name and select a cluster.");
      return;
    }

    if (name.length > 150) {
      setError("School name cannot exceed 150 characters.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/schools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          clusterId,
        }),
      });

      const result: {
        message?: string;
        error?: string;
      } = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || result.message || "Unable to create school."
        );
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong while creating the school."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // -------------------------------------------
  // LOCATION SELECT COMPONENT
  // -------------------------------------------

  function LocationSelect({
    id,
    label,
    value,
    onChange,
    state,
    placeholder,
    disabled = false,
  }: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    state: LocationState;
    placeholder: string;
    disabled?: boolean;
  }) {
    return (
      <div>
        <label htmlFor={id} className={labelClass}>
          {label}
          <span className="ml-1 text-red-500">*</span>
        </label>

        <select
          id={id}
          name={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled || state.loading || state.data.length === 0}
          required
          className={inputClass}
        >
          <option value="">
            {state.loading
              ? `Loading ${label.toLowerCase()}...`
              : state.data.length === 0
                ? `No ${label.toLowerCase()} available`
                : placeholder}
          </option>

          {state.data.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        {state.error && (
          <p className="mt-2 text-xs text-red-600">{state.error}</p>
        )}
      </div>
    );
  }

  // -------------------------------------------
  // RENDER
  // -------------------------------------------

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* HEADER */}
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Institution Management
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Add School
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Register a school and associate it with its correct
              administrative location.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.back()}
            className="self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 sm:self-auto"
          >
            ← Go back
          </button>
        </header>

        {/* LOCATION HIERARCHY */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="mb-6 flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xl">
              📍
            </div>

            <div>
              <h2 className="font-bold text-slate-800">
                Administrative Location
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Select each location in order to identify the school's cluster.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-7">

            <div className="grid gap-5 sm:grid-cols-2">

              <LocationSelect
                id="countyId"
                label="County"
                value={countyId}
                onChange={setCountyId}
                state={counties}
                placeholder="Select county"
              />

              <LocationSelect
                id="subcountyId"
                label="Subcounty"
                value={subcountyId}
                onChange={setSubcountyId}
                state={subcounties}
                placeholder="Select subcounty"
                disabled={!countyId}
              />

              <LocationSelect
                id="zoneId"
                label="Zone"
                value={zoneId}
                onChange={setZoneId}
                state={zones}
                placeholder="Select zone"
                disabled={!subcountyId}
              />

              <LocationSelect
                id="clusterId"
                label="Cluster"
                value={clusterId}
                onChange={setClusterId}
                state={clusters}
                placeholder="Select cluster"
                disabled={!zoneId}
              />

            </div>

            {/* SCHOOL INFORMATION */}
            <div className="border-t border-slate-100 pt-7">
              <div className="mb-5 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xl">
                  🏫
                </div>

                <div>
                  <h2 className="font-bold text-slate-800">
                    School Information
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Enter the official name of the institution.
                  </p>
                </div>
              </div>

              <div className="sm:pl-13">
                <label htmlFor="school" className={labelClass}>
                  School Name
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <input
                  type="text"
                  id="school"
                  name="school"
                  required
                  maxLength={150}
                  placeholder="Enter school name"
                  className={inputClass}
                />
              </div>
            </div>

            {/* LOCATION SUMMARY */}
            {clusterId && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Selected cluster
                </p>

                <p className="mt-1 font-semibold text-slate-800">
                  {clusters.data.find((item) => item.id === clusterId)?.name}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {counties.data.find((item) => item.id === countyId)?.name}
                  {" / "}
                  {subcounties.data.find((item) => item.id === subcountyId)?.name}
                  {" / "}
                  {zones.data.find((item) => item.id === zoneId)?.name}
                </p>
              </div>
            )}

            {/* ERROR */}
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                <p className="font-semibold">Unable to create school</p>
                <p className="mt-1">{error}</p>
              </div>
            )}

            {/* FOOTER */}
            <footer className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-400">
                All fields marked <span className="text-red-500">*</span> are required.
              </p>

              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => router.back()}
                  disabled={submitting}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !countyId ||
                    !subcountyId ||
                    !zoneId ||
                    !clusterId ||
                    !counties.data.length ||
                    !subcounties.data.length ||
                    !zones.data.length ||
                    !clusters.data.length
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      Creating School...
                    </>
                  ) : (
                    <>
                      Add School
                      <span aria-hidden="true">→</span>
                    </>
                  )}
                </button>
              </div>
            </footer>
          </form>
        </section>
      </div>
    </main>
  );
}