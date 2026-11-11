
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type NamedEntity = {
  id: string;
  name: string;
};

type ApiResponse<T> = {
  count?: number;
  data: T[];
  error?: string;
};

type UserRole =
  | "ADMIN"
  | "PRINCIPAL"
  | "TEACHER"
  | "STUDENT"
  | "PARENT";

type ListState<T> = {
  data: T[];
  loading: boolean;
  error: string;
};

const inputStyle =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100";

const selectStyle =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

const labelStyle = "mb-2 block text-sm font-medium text-slate-700";

function useRemoteList<T>(url: string | null): ListState<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!url) {
      setData([]);
      setLoading(false);
      setError("");
      return;
    }

    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(url, {
          method: "GET",
          signal: controller.signal,
        });

        const result: ApiResponse<T> = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Unable to load records.");
        }

        setData(Array.isArray(result.data) ? result.data : []);
      } catch (error) {
        if (!controller.signal.aborted) {
          setData([]);
          setError(
            error instanceof Error
              ? error.message
              : "Something went wrong."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => controller.abort();
  }, [url]);

  return { data, loading, error };
}

type LocationSelectProps = {
  label: string;
  name: string;
  value: string;
  options: NamedEntity[];
  onChange: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
};

function LocationSelect({
  label,
  name,
  value,
  options,
  onChange,
  disabled = false,
  loading = false,
}: LocationSelectProps) {
  return (
    <div>
      <label htmlFor={name} className={labelStyle}>
        {label}
      </label>

      <select
        id={name}
        name={name}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        disabled={disabled || loading}
        required
        className={selectStyle}
      >
        <option value="">
          {loading ? "Loading..." : `Select ${label.toLowerCase()}`}
        </option>

        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function RegistrationPage() {
  const router = useRouter();

  // Geographic selections
  const [countyId, setCountyId] = useState("");
  const [subcountyId, setSubcountyId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [clusterId, setClusterId] = useState("");
  const [schoolId, setSchoolId] = useState("");

  // Cascading location requests
  const counties = useRemoteList<NamedEntity>("/api/counties");

  const subcounties = useRemoteList<NamedEntity>(
    countyId
      ? `/api/subcounties?countyId=${encodeURIComponent(countyId)}`
      : null
  );

  const zones = useRemoteList<NamedEntity>(
    subcountyId
      ? `/api/zones?subcountyId=${encodeURIComponent(subcountyId)}`
      : null
  );

  const clusters = useRemoteList<NamedEntity>(
    zoneId
      ? `/api/clusters?zoneId=${encodeURIComponent(zoneId)}`
      : null
  );

  const schools = useRemoteList<NamedEntity>(
    clusterId
      ? `/api/schools?clusterId=${encodeURIComponent(clusterId)}`
      : null
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleCountyChange(value: string) {
    setCountyId(value);
    setSubcountyId("");
    setZoneId("");
    setClusterId("");
    setSchoolId("");
    setError("");
  }

  function handleSubcountyChange(value: string) {
    setSubcountyId(value);
    setZoneId("");
    setClusterId("");
    setSchoolId("");
    setError("");
  }

  function handleZoneChange(value: string) {
    setZoneId(value);
    setClusterId("");
    setSchoolId("");
    setError("");
  }

  function handleClusterChange(value: string) {
    setClusterId(value);
    setSchoolId("");
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Keep a reference before awaiting fetch.
    const form = event.currentTarget;

    setError("");
    setSuccess("");

    const formData = new FormData(form);

    const payload = {
      name: String(formData.get("name") || "").trim(),
      role: String(formData.get("role") || "") as UserRole,
      email: String(formData.get("email") || "").trim().toLowerCase(),
      phone: Number(formData.get("phone")),
      tsc: String(formData.get("tsc") || "").trim(),
      password: String(formData.get("password") || ""),
      schoolId,
    };

    if (
      !payload.name ||
      !payload.email ||
      !payload.password ||
      !payload.tsc ||
      !payload.schoolId ||
      !Number.isSafeInteger(payload.phone) ||
      payload.phone <= 0 ||
      !payload.role
    ) {
      setError("Please complete all required fields.");
      return;
    }

    if (payload.password.length < 8) {
      setError("Password must contain at least 8 characters.");
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

      setSuccess("Account created successfully. Redirecting to login...");

      form.reset();

      setCountyId("");
      setSubcountyId("");
      setZoneId("");
      setClusterId("");
      setSchoolId("");

      // Registration creates the account but does not log the user in.
      router.push("/dashboard/login?registered=true");
      router.refresh();
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

  const locationErrors = [
    counties.error,
    subcounties.error,
    zones.error,
    clusters.error,
    schools.error,
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl space-y-7">
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* INSTITUTION ASSIGNMENT */}
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
                options={counties.data}
                onChange={handleCountyChange}
                loading={counties.loading}
              />

              <LocationSelect
                label="Subcounty"
                name="subcountyId"
                value={subcountyId}
                options={subcounties.data}
                onChange={handleSubcountyChange}
                disabled={!countyId}
                loading={subcounties.loading}
              />

              <LocationSelect
                label="Zone"
                name="zoneId"
                value={zoneId}
                options={zones.data}
                onChange={handleZoneChange}
                disabled={!subcountyId}
                loading={zones.loading}
              />

              <LocationSelect
                label="Cluster"
                name="clusterId"
                value={clusterId}
                options={clusters.data}
                onChange={handleClusterChange}
                disabled={!zoneId}
                loading={clusters.loading}
              />

              <div className="md:col-span-2">
                <LocationSelect
                  label="School"
                  name="schoolId"
                  value={schoolId}
                  options={schools.data}
                  onChange={setSchoolId}
                  disabled={!clusterId}
                  loading={schools.loading}
                />
              </div>

              {locationErrors.map((message, index) => (
                <p
                  key={index}
                  className="text-sm text-red-600 md:col-span-2"
                >
                  {message}
                </p>
              ))}
            </div>
          </section>

          {/* USER INFORMATION */}
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
                  autoComplete="name"
                  maxLength={100}
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
                  defaultValue=""
                  className={selectStyle}
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
                  autoComplete="email"
                  maxLength={254}
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
                  required
                  inputMode="numeric"
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
                  required
                  maxLength={50}
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
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  className={inputStyle}
                />
              </div>
            </div>
          </section>

          {/* FEEDBACK */}
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {success && (
            <div
              role="status"
              className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
            >
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
              disabled={
                submitting ||
                counties.loading ||
                !schoolId
              }
              className="rounded-lg bg-blue-600 px-7 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Creating Account..." : "Create Account"}
            </button>

            <button
              type="button"
              disabled={submitting}
              onClick={() => router.push("/dashboard/login")}
              className="rounded-lg px-4 py-3 text-sm font-bold text-blue-600 transition hover:text-blue-800 disabled:opacity-50"
            >
              Login
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
