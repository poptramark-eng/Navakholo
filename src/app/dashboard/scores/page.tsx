
"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useCurrentUser } from "../../../components/NavigationalLayout";

// ---------------------------------------------
// TYPES
// ---------------------------------------------

type Assessment = {
  id: string;
  name: string;
};

type Subject = {
  id: string;
  name: string;
  code?: string;
};

type Student = {
  id: string;
  name: string;
  learnerId?: string;
};

type ExistingScore = {
  id: string;
  marks: string | number;
  candidateId: string;
  subjectId: string;
};

type ApiResponse<T> = {
  count: number;
  data: T[];
  message?: string;
};

type ScoreRow = {
  value: string;
  status: "idle" | "saving" | "saved" | "error";
  message?: string;
};

const GRADES = [
  "GRADE_1",
  "GRADE_2",
  "GRADE_3",
  "GRADE_4",
  "GRADE_5",
  "GRADE_6",
  "GRADE_7",
  "GRADE_8",
  "GRADE_9",
];

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50";

const selectClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50";

// ---------------------------------------------
// COMPONENT
// ---------------------------------------------

export default function MarksEntry() {
  const { user, loading: profileLoading } = useCurrentUser();

  const schoolId = user?.school?.id ?? "";
  const schoolName = user?.school?.name ?? "";

  // Data
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  // Selection
  const [assessmentId, setAssessmentId] = useState("");
  const [grade, setGrade] = useState("");
  const [subjectId, setSubjectId] = useState("");

  // Marks and loading
  const [rows, setRows] = useState<Record<string, ScoreRow>>({});
  const [pageLoading, setPageLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // ---------------------------------------------
  // DERIVED DATA
  // ---------------------------------------------

  const selectedSubject = subjects.find(
    (subject) => subject.id === subjectId
  );

  const recordedCount = students.filter(
    (student) => rows[student.id]?.status === "saved"
  ).length;

  const pendingCount = students.length - recordedCount;

  const progress = students.length
    ? Math.round((recordedCount / students.length) * 100)
    : 0;

  const ready = Boolean(assessmentId && grade && subjectId);

  const sortedStudents = useMemo(
    () => [...students].sort((a, b) => a.name.localeCompare(b.name)),
    [students]
  );

  // ---------------------------------------------
  // LOAD ASSESSMENTS AND SUBJECTS
  // ---------------------------------------------

  useEffect(() => {
    if (profileLoading) return;

    let active = true;

    async function loadConfiguration() {
      setPageLoading(true);
      setError("");

      try {
        const [assessmentResponse, subjectResponse] = await Promise.all([
          fetch("/api/assessments"),
          fetch("/api/subject"),
        ]);

        if (!assessmentResponse.ok || !subjectResponse.ok) {
          throw new Error("We couldn't load the assessment configuration.");
        }

        const [assessmentData, subjectData] = await Promise.all([
          assessmentResponse.json(),
          subjectResponse.json(),
        ]);

        if (!active) return;

        setAssessments(assessmentData.data ?? []);
        setSubjects(subjectData.data ?? []);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load assessment information."
          );
        }
      } finally {
        if (active) setPageLoading(false);
      }
    }

    loadConfiguration();

    return () => {
      active = false;
    };
  }, [profileLoading]);

  // ---------------------------------------------
  // LOAD STUDENTS AND EXISTING MARKS
  // ---------------------------------------------

  useEffect(() => {
    let active = true;

    async function loadStudents() {
      setStudents([]);
      setRows({});
      setError("");
      setSuccessMessage("");

      if (!ready || !schoolId) {
        setStudentsLoading(false);
        return;
      }

      setStudentsLoading(true);

      try {
        const params = new URLSearchParams({
          schoolId,
          assessmentId,
          grade,
        });

        const candidateResponse = await fetch(
          `/api/candidates?${params.toString()}`
        );

        if (!candidateResponse.ok) {
          throw new Error("Unable to retrieve student records.");
        }

        const candidateData: ApiResponse<Student> =
          await candidateResponse.json();

        if (!active) return;

        const candidateList = candidateData.data ?? [];
        setStudents(candidateList);

        // Fetch existing marks for this subject.
        const scoreResponse = await fetch(
          `/api/scores?subjectId=${encodeURIComponent(subjectId)}`
        );

        if (!scoreResponse.ok) {
          throw new Error("Students loaded, but existing marks could not be retrieved.");
        }

        const scoreData: ApiResponse<ExistingScore> =
          await scoreResponse.json();

        if (!active) return;

        const candidateIds = new Set(
          candidateList.map((student) => student.id)
        );

        const existingRows: Record<string, ScoreRow> = {};

        for (const score of scoreData.data ?? []) {
          if (
            candidateIds.has(score.candidateId) &&
            score.subjectId === subjectId
          ) {
            existingRows[score.candidateId] = {
              value: String(score.marks),
              status: "saved",
            };
          }
        }

        setRows(existingRows);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load student records."
          );
        }
      } finally {
        if (active) setStudentsLoading(false);
      }
    }

    loadStudents();

    return () => {
      active = false;
    };
  }, [ready, schoolId, assessmentId, grade, subjectId]);

  // ---------------------------------------------
  // MARK INPUT
  // ---------------------------------------------

  function updateMark(candidateId: string, value: string) {
    setRows((current) => ({
      ...current,
      [candidateId]: {
        value,
        status: "idle",
      },
    }));

    setSuccessMessage("");
  }

  // ---------------------------------------------
  // SAVE MARK
  // ---------------------------------------------

  async function saveScore(
    event: FormEvent<HTMLFormElement>,
    candidateId: string
  ) {
    event.preventDefault();

    const row = rows[candidateId];

    if (!row || !subjectId) return;

    const marks = row.value.trim();

    if (!marks || !/^\d{1,3}(\.\d{1,2})?$/.test(marks)) {
      setRows((current) => ({
        ...current,
        [candidateId]: {
          ...current[candidateId],
          status: "error",
          message: "Enter a valid mark.",
        },
      }));
      return;
    }

    const numericMarks = Number(marks);

    if (!Number.isFinite(numericMarks) || numericMarks < 0 || numericMarks > 100) {
      setRows((current) => ({
        ...current,
        [candidateId]: {
          ...current[candidateId],
          status: "error",
          message: "Marks must be between 0 and 100.",
        },
      }));
      return;
    }

    setRows((current) => ({
      ...current,
      [candidateId]: {
        ...current[candidateId],
        status: "saving",
        message: undefined,
      },
    }));

    setError("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/scores", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          candidateId,
          subjectId,
          marks: numericMarks,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to save this mark."
        );
      }

      setRows((current) => ({
        ...current,
        [candidateId]: {
          value: String(result.data.marks),
          status: "saved",
        },
      }));

      setSuccessMessage("Mark recorded successfully.");
    } catch (err) {
      setRows((current) => ({
        ...current,
        [candidateId]: {
          ...current[candidateId],
          status: "error",
          message:
            err instanceof Error
              ? err.message
              : "Unable to save this mark.",
        },
      }));
    }
  }

  // ---------------------------------------------
  // RESET FILTERS
  // ---------------------------------------------

  function resetConfiguration() {
    setAssessmentId("");
    setGrade("");
    setSubjectId("");
    setStudents([]);
    setRows({});
    setError("");
    setSuccessMessage("");
  }

  // ---------------------------------------------
  // RENDER
  // ---------------------------------------------

  if (profileLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center">
        <p className="text-sm text-slate-500">Loading your account...</p>
      </div>
    );
  }

  return (
    <main className="space-y-6">

      {/* PAGE HEADER */}

      <header className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Examination Management
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
            Marks Entry
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {schoolName || "School Dashboard"} · Record and manage student marks.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
          <p className="text-xs text-slate-500">Current school</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {schoolName || "Not assigned"}
          </p>
        </div>
      </header>

      {/* ERROR */}

      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <span className="mt-0.5 text-red-600">!</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              Something needs your attention
            </p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-sm text-red-600 hover:text-red-800"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* CONFIGURATION */}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-slate-900">
              Assessment configuration
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose the examination and learning area you want to work on.
            </p>
          </div>

          <button
            type="button"
            onClick={resetConfiguration}
            className="text-sm font-medium text-slate-500 transition hover:text-blue-600"
          >
            Clear selection
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">

          <div className="space-y-2">
            <label htmlFor="assessment" className="text-sm font-medium text-slate-700">
              Assessment
            </label>
            <select
              id="assessment"
              className={selectClass}
              value={assessmentId}
              disabled={pageLoading}
              onChange={(e) => setAssessmentId(e.target.value)}
            >
              <option value="">
                {pageLoading ? "Loading..." : "Select assessment"}
              </option>
              {assessments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="grade" className="text-sm font-medium text-slate-700">
              Grade
            </label>
            <select
              id="grade"
              className={selectClass}
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            >
              <option value="">Select grade</option>
              {GRADES.map((item) => (
                <option key={item} value={item}>
                  {item.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="subject" className="text-sm font-medium text-slate-700">
              Learning area
            </label>
            <select
              id="subject"
              className={selectClass}
              value={subjectId}
              disabled={pageLoading}
              onChange={(e) => setSubjectId(e.target.value)}
            >
              <option value="">
                {pageLoading ? "Loading..." : "Select learning area"}
              </option>
              {subjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

        </div>
      </section>

      {/* CURRENT SELECTION */}

      {ready && (
        <section className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                Current selection
              </p>
              <h2 className="mt-1 text-lg font-bold text-blue-950">
                {selectedSubject?.name}
              </h2>
              <p className="mt-1 text-sm text-blue-800">
                {grade.replace("_", " ")} ·{" "}
                {assessments.find((item) => item.id === assessmentId)?.name}
              </p>
            </div>

            <div className="flex gap-2">
              <div className="rounded-lg bg-white px-3 py-2 text-center">
                <p className="text-xl font-bold text-slate-900">
                  {students.length}
                </p>
                <p className="text-xs text-slate-500">Learners</p>
              </div>
              <div className="rounded-lg bg-white px-3 py-2 text-center">
                <p className="text-xl font-bold text-green-700">
                  {recordedCount}
                </p>
                <p className="text-xs text-slate-500">Recorded</p>
              </div>
              <div className="rounded-lg bg-white px-3 py-2 text-center">
                <p className="text-xl font-bold text-amber-600">
                  {pendingCount}
                </p>
                <p className="text-xs text-slate-500">Pending</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* STUDENT RECORDS */}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-slate-900">
              Student records
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter marks out of 100 for each learner.
            </p>
          </div>

          {ready && !studentsLoading && (
            <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
              {students.length} learners
            </span>
          )}
        </div>

        {!ready ? (
          <div className="flex flex-col items-center px-5 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500">
              ≡
            </div>
            <h3 className="mt-4 font-semibold text-slate-800">
              Configure your assessment
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Select an assessment, grade and learning area to display the learners.
            </p>
          </div>
        ) : studentsLoading ? (
          <div className="flex flex-col items-center px-5 py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
            <p className="mt-4 text-sm text-slate-500">
              Loading learners and existing marks...
            </p>
          </div>
        ) : students.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <h3 className="font-semibold text-slate-800">
              No learners found
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              There are no registered learners matching this selection.
            </p>
          </div>
        ) : (
          <>
            {/* PROGRESS */}

            <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-600">
                  Recording progress
                </span>
                <span className="font-semibold text-slate-800">
                  {recordedCount} / {students.length}
                </span>
              </div>

              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* TABLE */}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-sm">
                <thead>
                  <tr className="bg-white text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="w-16 px-5 py-4 font-semibold">No.</th>
                    <th className="px-5 py-4 font-semibold">Learner</th>
                    <th className="w-44 px-5 py-4 font-semibold">
                      Marks / 100
                    </th>
                    <th className="w-40 px-5 py-4 font-semibold">Status</th>
                    <th className="w-36 px-5 py-4 font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {sortedStudents.map((student, index) => {
                    const row = rows[student.id] ?? {
                      value: "",
                      status: "idle" as const,
                    };

                    const isSaved = row.status === "saved";
                    const isSaving = row.status === "saving";

                    return (
                      <tr
                        key={student.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-medium text-slate-400">
                          {String(index + 1).padStart(2, "0")}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800">
                            {student.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Learner ID: {student.learnerId || student.id}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <form
                            id={`score-${student.id}`}
                            onSubmit={(e) => saveScore(e, student.id)}
                          >
                            <input
                              type="number"
                              name="marks"
                              min="0"
                              max="100"
                              step="0.01"
                              required
                              value={row.value}
                              disabled={isSaved || isSaving}
                              onChange={(e) =>
                                updateMark(student.id, e.target.value)
                              }
                              placeholder="Enter mark"
                              aria-label={`Marks for ${student.name}`}
                              className={`${inputClass} max-w-32 text-center font-semibold`}
                            />
                          </form>
                          {row.status === "error" && (
                            <p className="mt-1 text-xs text-red-600">
                              {row.message}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          {row.status === "saved" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1.5 text-xs font-semibold text-green-700">
                              <span>✓</span> Recorded
                            </span>
                          )}

                          {row.status === "saving" && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600">
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                              Saving...
                            </span>
                          )}

                          {row.status === "error" && (
                            <span className="text-xs font-medium text-red-600">
                              Not saved
                            </span>
                          )}

                          {row.status === "idle" && (
                            <span className="text-xs text-slate-400">
                              Not recorded
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <button
                            type="submit"
                            form={`score-${student.id}`}
                            disabled={
                              isSaved ||
                              isSaving ||
                              !row.value.trim()
                            }
                            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                          >
                            {isSaving ? "Saving..." : isSaved ? "Saved" : "Save mark"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* TABLE FOOTER */}

            <div className="flex flex-col justify-between gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center">
              <p className="text-xs text-slate-500">
                {recordedCount} marks recorded · {pendingCount} remaining
              </p>

              {recordedCount === students.length && students.length > 0 && (
                <span className="text-xs font-semibold text-green-700">
                  All marks have been recorded.
                </span>
              )}
            </div>
          </>
        )}
      </section>

      {/* FEEDBACK */}

      {successMessage && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
        >
          ✓ {successMessage}
        </div>
      )}

      <footer className="border-t border-slate-200 pt-4 text-xs text-slate-400">
        Examination Management System · Marks Entry
      </footer>
    </main>
  );
}
