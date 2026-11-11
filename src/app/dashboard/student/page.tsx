"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";

import { GradeLevel } from "../../../generated/prisma/enums";
import { useCurrentUser } from "../../../components/NavigationalLayout";

// ---------------------------------------------
// TYPES
// ---------------------------------------------

type Assessment = {
  id: string;
  name: string;
};

type ApiResponse<T> = {
  count: number;
  data: T[];
};

type CandidatePayload = {
  name: string;
  gender: string;
  grade: GradeLevel;
  assessmentId: string;
};

type PossibleMatch = {
  name: string;
  grade: string;
  candidateNumber: string;
};

type RegistrationResult = {
  id: string;
  name: string;
  grade: string;
  candidateNumber: string;
  assessmentId: string;
  school: string;
};

const grades = Object.values(GradeLevel);

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:bg-slate-100";

const labelClass = "text-sm font-semibold text-slate-700";

// ---------------------------------------------
// PAGE
// ---------------------------------------------

export default function ClusterPage() {
  const router = useRouter();
  const { user } = useCurrentUser();

  // Data
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  // Loading
  const [loading, setLoading] = useState(false);
  const [loadingAssessments, setLoadingAssessments] = useState(true);

  // Feedback
  const [error, setError] = useState("");
  const [possibleMatches, setPossibleMatches] = useState<PossibleMatch[]>([]);
  const [pendingPayload, setPendingPayload] =
    useState<CandidatePayload | null>(null);
  const [success, setSuccess] = useState<RegistrationResult | null>(null);

  // -------------------------------------------
  // FETCH ASSESSMENTS
  // -------------------------------------------

  useEffect(() => {
    const controller = new AbortController();

    async function fetchAssessments() {
      try {
        const response = await fetch("/api/assessments", {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load assessments.");
        }

        const result: ApiResponse<Assessment> = await response.json();

        setAssessments(result.data ?? []);
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load assessments."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingAssessments(false);
        }
      }
    }

    fetchAssessments();

    return () => controller.abort();
  }, []);

  // -------------------------------------------
  // SUBMIT REGISTRATION
  // -------------------------------------------

  async function registerCandidate(
    payload: CandidatePayload,
    confirmDifferentLearner = false
  ) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/candidates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          confirmDifferentLearner,
        }),
      });

      const result = await response.json();

      // Possible duplicate found
      if (response.status === 409 && result.requiresConfirmation) {
        setPossibleMatches(result.possibleMatches ?? []);
        setPendingPayload(payload);
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.error ||
            result.message ||
            "Unable to register student."
        );
      }

      setSuccess(result.data);
      setPossibleMatches([]);
      setPendingPayload(null);
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

  // -------------------------------------------
  // FORM SUBMISSION
  // -------------------------------------------

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setPossibleMatches([]);
    setPendingPayload(null);

    const form = new FormData(event.currentTarget);

    const payload: CandidatePayload = {
      name: String(form.get("name") ?? "").trim(),
      gender: String(form.get("gender") ?? ""),
      grade: String(form.get("grade") ?? "") as GradeLevel,
      assessmentId: String(form.get("assessmentId") ?? ""),
    };

    if (
      !payload.name ||
      !payload.gender ||
      !payload.assessmentId ||
      !grades.includes(payload.grade)
    ) {
      setError("Please complete all required fields.");
      return;
    }

    await registerCandidate(payload);
  }

  // -------------------------------------------
  // CONFIRM POSSIBLE DUPLICATE
  // -------------------------------------------

  async function confirmRegistration() {
    if (!pendingPayload) return;

    await registerCandidate(pendingPayload, true);
  }

  // -------------------------------------------
  // RESET FORM
  // -------------------------------------------

  function registerAnother() {
    setSuccess(null);
    setError("");
    setPossibleMatches([]);
    setPendingPayload(null);
  }

  // -------------------------------------------
  // SUCCESS SCREEN
  // -------------------------------------------

  if (success) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-8 w-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m5 12 4 4L19 6"
                />
              </svg>
            </div>

            <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-emerald-600">
              Registration successful
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              Student registered
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              The learner has been added to the selected assessment.
            </p>

            <div className="mt-8 rounded-xl border border-indigo-200 bg-indigo-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                Candidate Registration Number
              </p>

              <p className="mt-3 break-all font-mono text-xl font-bold tracking-wide text-indigo-900 sm:text-2xl">
                {success.candidateNumber}
              </p>

              <button
                type="button"
                onClick={() =>
                  navigator.clipboard.writeText(success.candidateNumber)
                }
                className="mt-4 rounded-lg border border-indigo-200 bg-white px-4 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
              >
                Copy candidate number
              </button>
            </div>

            <div className="mt-6 space-y-3 text-left">
              <div className="flex justify-between gap-4 border-b border-slate-100 pb-3 text-sm">
                <span className="text-slate-500">Student</span>
                <span className="text-right font-semibold text-slate-800">
                  {success.name}
                </span>
              </div>

              <div className="flex justify-between gap-4 border-b border-slate-100 pb-3 text-sm">
                <span className="text-slate-500">Grade</span>
                <span className="font-semibold text-slate-800">
                  {success.grade.replaceAll("_", " ")}
                </span>
              </div>

              <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-500">School</span>
                <span className="text-right font-semibold text-slate-800">
                  {success.school}
                </span>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={registerAnother}
                className="flex-1 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Register Another Student
              </button>

              <button
                type="button"
                onClick={() => router.push("/")}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // -------------------------------------------
  // REGISTRATION FORM
  // -------------------------------------------

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* HEADER */}
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Student Management
            </p>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Register Student
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
              Register a learner for an examination. A unique candidate
              number will be generated automatically.
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

        {/* SCHOOL */}
        <section className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-sm">
            <span className="text-xl">🏫</span>
          </div>

          <div className="min-w-0">
            <p className="text-xs font-medium text-indigo-600">
              Registering under
            </p>
            <p className="truncate font-semibold text-slate-800">
              {user?.school?.name || "School not assigned"}
            </p>
          </div>
        </section>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="space-y-8 p-5 sm:p-8">

            {/* ASSESSMENT */}
            <section className="space-y-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-700">
                  01
                </span>

                <div>
                  <h2 className="font-bold text-slate-800">
                    Assessment Information
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Select the examination for this learner.
                  </p>
                </div>
              </div>

              <div className="space-y-2 sm:pl-12">
                <label htmlFor="assessmentId" className={labelClass}>
                  Examination Assessment
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <select
                  name="assessmentId"
                  id="assessmentId"
                  required
                  disabled={loadingAssessments || assessments.length === 0}
                  defaultValue=""
                  className={inputClass}
                >
                  <option value="">
                    {loadingAssessments
                      ? "Loading assessments..."
                      : assessments.length === 0
                        ? "No assessments available"
                        : "Select an assessment"}
                  </option>

                  {assessments.map((assessment) => (
                    <option key={assessment.id} value={assessment.id}>
                      {assessment.name}
                    </option>
                  ))}
                </select>

                <p className="text-xs text-slate-400">
                  {loadingAssessments
                    ? "Loading available assessments..."
                    : `${assessments.length} assessment(s) available.`}
                </p>
              </div>
            </section>

            <div className="border-t border-slate-100" />

            {/* STUDENT DETAILS */}
            <section className="space-y-5">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-700">
                  02
                </span>

                <div>
                  <h2 className="font-bold text-slate-800">
                    Student Details
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Provide the learner's personal and academic details.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2 sm:pl-12">

                {/* NAME */}
                <div className="space-y-2">
                  <label htmlFor="name" className={labelClass}>
                    Student Full Name
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    maxLength={100}
                    autoComplete="name"
                    placeholder="Enter full name"
                    className={inputClass}
                  />
                </div>

                {/* GENDER */}
                <div className="space-y-2">
                  <label htmlFor="gender" className={labelClass}>
                    Gender
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <select
                    name="gender"
                    id="gender"
                    required
                    defaultValue=""
                    className={inputClass}
                  >
                    <option value="">Select gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>

                {/* GRADE */}
                <div className="space-y-2">
                  <label htmlFor="grade" className={labelClass}>
                    Grade Level
                    <span className="ml-1 text-red-500">*</span>
                  </label>

                  <select
                    name="grade"
                    id="grade"
                    required
                    defaultValue=""
                    className={inputClass}
                  >
                    <option value="">Select grade</option>

                    {grades.map((grade) => (
                      <option key={grade} value={grade}>
                        {grade.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* CANDIDATE NUMBER INFORMATION */}
            <section className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <span className="text-lg">ℹ️</span>
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Candidate number generation
                </p>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  You do not need to enter an admission number. The system
                  will generate a unique candidate number after successful
                  registration.
                </p>
              </div>
            </section>

            {/* POSSIBLE DUPLICATES */}
            {possibleMatches.length > 0 && (
              <section className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div>
                  <h3 className="font-semibold text-amber-900">
                    Possible existing learner
                  </h3>
                  <p className="mt-1 text-sm leading-5 text-amber-800">
                    We found a learner with the same name and grade in this
                    assessment. Check the details before continuing.
                  </p>
                </div>

                <div className="space-y-2">
                  {possibleMatches.map((match) => (
                    <div
                      key={match.candidateNumber}
                      className="rounded-lg border border-amber-200 bg-white p-3"
                    >
                      <p className="font-semibold text-slate-800">
                        {match.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {match.grade.replaceAll("_", " ")}
                      </p>
                      <p className="mt-1 font-mono text-xs text-indigo-700">
                        {match.candidateNumber}
                      </p>
                    </div>
                  ))}
                </div>

                <p className="text-xs leading-5 text-amber-800">
                  Only continue if you have verified that this is a different
                  learner. This will create another registration.
                </p>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setPossibleMatches([]);
                      setPendingPayload(null);
                    }}
                    className="rounded-lg border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                  >
                    Review details
                  </button>

                  <button
                    type="button"
                    disabled={loading || !pendingPayload}
                    onClick={confirmRegistration}
                    className="rounded-lg bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:opacity-50"
                  >
                    {loading
                      ? "Registering..."
                      : "Verified — register different learner"}
                  </button>
                </div>
              </section>
            )}

            {/* ERROR */}
            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              >
                <p className="font-semibold">Registration error</p>
                <p className="mt-1">{error}</p>
              </div>
            )}
          </div>

          {/* FOOTER */}
          <footer className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p className="text-xs text-slate-400">
              Fields marked <span className="text-red-500">*</span> are required.
            </p>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => router.back()}
                disabled={loading}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  loading ||
                  loadingAssessments ||
                  assessments.length === 0 ||
                  !user?.school?.id
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Registering...
                  </>
                ) : (
                  <>
                    Register Student
                    <span aria-hidden="true">→</span>
                  </>
                )}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </main>
  );
}