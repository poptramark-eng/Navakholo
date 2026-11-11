
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

// ------------------------------------
// TYPES
// ------------------------------------

type NamedEntity = {
  id: string;
  name: string;
};

type County = NamedEntity & {
  regionId: string;
};

type Subcounty = NamedEntity & {
  countyId: string;
};

type Zone = NamedEntity & {
  subcountyId: string;
};

type Cluster = NamedEntity & {
  zoneId: string;
};

type School = NamedEntity & {
  clusterId: string;
};

type ApiResponse<T> = {
  count: number | string;
  data: T[];
};

type LoadingState = {
  counties: boolean;
  subcounties: boolean;
  zones: boolean;
  clusters: boolean;
  schools: boolean;
};

// ------------------------------------
// API HELPER
// ------------------------------------

async function fetchList<T>(
  url: string,
  signal: AbortSignal
): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    method: "GET",
    signal,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json();
}

const selectStyle =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

const inputStyle =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

const labelStyle =
  "mb-2 block text-sm font-medium text-slate-700";

// ------------------------------------
// MAIN COMPONENT
// ------------------------------------

export default function ClusterPage() {
  const router = useRouter();

  // Geographic data
  const [counties, setCounties] =
    useState<ApiResponse<County>>();

  const [subcounties, setSubcounties] =
    useState<ApiResponse<Subcounty>>();

  const [zones, setZones] =
    useState<ApiResponse<Zone>>();

  const [clusters, setClusters] =
    useState<ApiResponse<Cluster>>();

  const [schools, setSchools] =
    useState<ApiResponse<School>>();

  // Selected geographic IDs
  const [countyId, setCountyId] = useState("");
  const [subcountyId, setSubcountyId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [clusterId, setClusterId] = useState("");

  // Loading states
  const [loading, setLoading] = useState<LoadingState>({
    counties: true,
    subcounties: false,
    zones: false,
    clusters: false,
    schools: false,
  });

  // Form states
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ------------------------------------
  // LOAD COUNTIES
  // ------------------------------------

  useEffect(() => {
    const controller = new AbortController();

    async function loadCounties() {
      try {
        setLoading((prev) => ({
          ...prev,
          counties: true,
        }));

        const response = await fetchList<County>(
          "/api/counties",
          controller.signal
        );

        setCounties(response);
      } catch (error) {
        if (!controller.signal.aborted) {
          setError("Unable to load counties.");
          console.error(error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading((prev) => ({
            ...prev,
            counties: false,
          }));
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
      setSubcounties(undefined);
      return;
    }

    const controller = new AbortController();

    async function loadSubcounties() {
      try {
        setLoading((prev) => ({
          ...prev,
          subcounties: true,
        }));

        const response = await fetchList<Subcounty>(
          `/api/subcounties?countyId=${encodeURIComponent(countyId)}`,
          controller.signal
        );

        setSubcounties(response);
      } catch (error) {
        if (!controller.signal.aborted) {
          setError("Unable to load subcounties.");
          console.error(error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading((prev) => ({
            ...prev,
            subcounties: false,
          }));
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
      setZones(undefined);
      return;
    }

    const controller = new AbortController();

    async function loadZones() {
      try {
        setLoading((prev) => ({
          ...prev,
          zones: true,
        }));

        const response = await fetchList<Zone>(
          `/api/zones?subcountyId=${encodeURIComponent(subcountyId)}`,
          controller.signal
        );

        setZones(response);
      } catch (error) {
        if (!controller.signal.aborted) {
          setError("Unable to load zones.");
          console.error(error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading((prev) => ({
            ...prev,
            zones: false,
          }));
        }
      }
    }

    loadZones();

    return () => controller.abort();
  }, [subcountyId]);

  // ------------------------------------
  // LOAD CLUSTERS
  // ------------------------------------

  useEffect(() => {
    if (!zoneId) {
      setClusters(undefined);
      return;
    }

    const controller = new AbortController();

    async function loadClusters() {
      try {
        setLoading((prev) => ({
          ...prev,
          clusters: true,
        }));

        const response = await fetchList<Cluster>(
          `/api/clusters?zoneId=${encodeURIComponent(zoneId)}`,
          controller.signal
        );

        setClusters(response);
      } catch (error) {
        if (!controller.signal.aborted) {
          setError("Unable to load clusters.");
          console.error(error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading((prev) => ({
            ...prev,
            clusters: false,
          }));
        }
      }
    }

    loadClusters();

    return () => controller.abort();
  }, [zoneId]);

  // ------------------------------------
  // LOAD SCHOOLS
  // ------------------------------------

  useEffect(() => {
    if (!clusterId) {
      setSchools(undefined);
      return;
    }

    const controller = new AbortController();

    async function loadSchools() {
      try {
        setLoading((prev) => ({
          ...prev,
          schools: true,
        }));

        const response = await fetchList<School>(
          `/api/schools?clusterId=${encodeURIComponent(clusterId)}`,
          controller.signal
        );

        setSchools(response);
      } catch (error) {
        if (!controller.signal.aborted) {
          setError("Unable to load schools.");
          console.error(error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading((prev) => ({
            ...prev,
            schools: false,
          }));
        }
      }
    }

    loadSchools();

    return () => controller.abort();
  }, [clusterId]);

  // ------------------------------------
  // GEOGRAPHIC SELECTION HANDLERS
  // ------------------------------------

  function handleCountyChange(value: string) {
    setCountyId(value);

    setSubcountyId("");
    setZoneId("");
    setClusterId("");

    setSubcounties(undefined);
    setZones(undefined);
    setClusters(undefined);
    setSchools(undefined);

    setError("");
  }

  function handleSubcountyChange(value: string) {
    setSubcountyId(value);

    setZoneId("");
    setClusterId("");

    setZones(undefined);
    setClusters(undefined);
    setSchools(undefined);

    setError("");
  }

  function handleZoneChange(value: string) {
    setZoneId(value);

    setClusterId("");

    setClusters(undefined);
    setSchools(undefined);

    setError("");
  }

  function handleClusterChange(value: string) {
    setClusterId(value);

    setSchools(undefined);
    setError("");
  }

  // ------------------------------------
  // FORM SUBMISSION
  // ------------------------------------

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    const payload = {
      name: String(formData.get("name") || "").trim(),
      role: String(formData.get("role") || ""),
      email: String(formData.get("email") || "").trim(),
      phone: Number(formData.get("phone")),
      tsc: String(formData.get("tsc") || "").trim(),
      password: String(formData.get("password") || ""),
      schoolId: String(formData.get("schoolId") || ""),
    };

    if (
      !payload.name ||
      !payload.email ||
      !payload.password ||
      !payload.schoolId
    ) {
      setError("Please complete all required fields.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result: {
        message?: string;
        error?: string;
      } = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to create account."
        );
      }

      setSuccess("Account created successfully.");

      router.push("/");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ------------------------------------
  // SELECT FIELD HELPER
  // ------------------------------------

  function LocationSelect({
    label,
    name,
    value,
    options,
    onChange,
    disabled,
    isLoading,
    placeholder,
  }: {
    label: string;
    name: string;
    value: string;
    options?: { id: string; name: string }[];
    onChange: (value: string) => void;
    disabled?: boolean;
    isLoading?: boolean;
    placeholder: string;
  }) {
    return (
      <div>
        <label htmlFor={name} className={labelStyle}>
          {label}
        </label>

        <select
          id={name}
          name={name}
          value={value}
          onChange={(e) => onChange(e.currentTarget.value)}
          disabled={disabled || isLoading}
          required
          className={selectStyle}
        >
          <option value="">
            {isLoading ? "Loading..." : placeholder}
          </option>

          {options?.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // ------------------------------------
  // UI
  // ------------------------------------

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">

      <div className="mx-auto max-w-5xl space-y-7">

        {/* HEADER */}

        <header className="border-b border-slate-200 pb-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
            Administration
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Create User Account
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Register a new user and assign them to an institution.
          </p>
        </header>

        {/* FORM */}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* LOCATION */}

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-200 px-5 py-4 md:px-6">
              <h2 className="font-bold text-slate-800">
                Institution Assignment
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Select the geographical hierarchy of the school.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 md:p-6">

              <LocationSelect
                label="County"
                name="countyId"
                value={countyId}
                options={counties?.data}
                onChange={handleCountyChange}
                isLoading={loading.counties}
                placeholder="Select county"
              />

              <LocationSelect
                label="Subcounty"
                name="subcountyId"
                value={subcountyId}
                options={subcounties?.data}
                onChange={handleSubcountyChange}
                disabled={!countyId}
                isLoading={loading.subcounties}
                placeholder="Select subcounty"
              />

              <LocationSelect
                label="Zone"
                name="zoneId"
                value={zoneId}
                options={zones?.data}
                onChange={handleZoneChange}
                disabled={!subcountyId}
                isLoading={loading.zones}
                placeholder="Select zone"
              />

              <LocationSelect
                label="Cluster"
                name="clusterId"
                value={clusterId}
                options={clusters?.data}
                onChange={handleClusterChange}
                disabled={!zoneId}
                isLoading={loading.clusters}
                placeholder="Select cluster"
              />

              <div className="md:col-span-2">
                <LocationSelect
                  label="School"
                  name="schoolId"
                  value={undefined as unknown as string}
                  options={schools?.data}
                  onChange={() => {}}
                  disabled={!clusterId}
                  isLoading={loading.schools}
                  placeholder="Select school"
                />
              </div>

            </div>
          </section>

          {/* USER DETAILS */}

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

            <div className="border-b border-slate-200 px-5 py-4 md:px-6">
              <h2 className="font-bold text-slate-800">
                User Information
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Enter the personal and login details of the user.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 md:p-6">

              <div>
                <label htmlFor="name" className={labelStyle}>
                  Full Name
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Enter full name"
                  className={inputStyle}
                />
              </div>

              <div>
                <label htmlFor="role" className={labelStyle}>
                  User Role
                </label>

                <select
                  id="role"
                  name="role"
                  required
                  className={selectStyle}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select role
                  </option>

                  <option value="ADMIN">Administrator</option>
                  <option value="PRINCIPAL">Principal</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="STUDENT">Student</option>
                  <option value="PARENT">Parent</option>
                </select>
              </div>

              <div>
                <label htmlFor="email" className={labelStyle}>
                  Email Address
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="example@email.com"
                  className={inputStyle}
                />
              </div>

              <div>
                <label htmlFor="phone" className={labelStyle}>
                  Phone Number
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="07XXXXXXXX"
                  className={inputStyle}
                />
              </div>

              <div>
                <label htmlFor="tsc" className={labelStyle}>
                  TSC Number
                </label>

                <input
                  id="tsc"
                  name="tsc"
                  type="text"
                  placeholder="Enter TSC number"
                  className={inputStyle}
                />
              </div>

              <div>
                <label htmlFor="password" className={labelStyle}>
                  Password
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  placeholder="Minimum 8 characters"
                  className={inputStyle}
                />
              </div>

            </div>
          </section>

          {/* FEEDBACK */}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {success}
            </div>
          )}

          {/* ACTIONS */}

          <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">

            <button
              type="button"
              onClick={() => router.back()}
              disabled={submitting}
              className="rounded-lg border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || loading.counties}
              className="rounded-lg bg-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creating Account..." : "Create Account"}
            </button>

          </div>

        </form>

      </div>
    </main>
  );
}
