
"use client";

import { useEffect, useMemo, useState } from "react";

import { grades, type Grade } from "@/config/curriculum";

// --------------------------------------------------
// TYPES
// --------------------------------------------------

type Assessment = {
  id: string;
  name: string;
  year: number;
};

type SubjectColumn = {
  id: string;
  code: string;
  name: string;
};

type Candidate = {
  id: string;
  learnerId: string;
  name: string;
  gender: string | null;
  grade: Grade;
  category?: string | null;
  school: {
    id: string;
    name: string;
    category?: string | null;
    cluster?: {
      id?: string;
      name: string;
    } | null;
  };
  scores: Record<string, number | null>;
  total: number;
  recordedSubjects: number;
  position: number;
};

type GradeResults = {
  grade: Grade;
  count: number;
  columns: SubjectColumn[];
  rows: Candidate[];
};

type AssessmentResponse = {
  count: number;
  data: Assessment[];
};

type ResultsResponse = {
  success: boolean;
  assessment: Assessment;
  count: number;
  data: GradeResults[];
  message?: string;
};

type SchoolReport = {
  id: string;
  name: string;
  category: string;
  cluster: string;
  entry: number;
  subjectAverages: Record<string, number | null>;
  totalAverage: number;
  overallAverage: number;
  performance: Performance;
  position: number;
};

type Performance = {
  point: number;
  band: string;
  label: string;
};

// --------------------------------------------------
// CBE GRADING
// --------------------------------------------------

function getPerformance(mark: number | null | undefined): Performance | null {
  if (mark === null || mark === undefined || !Number.isFinite(mark)) {
    return null;
  }

  if (mark >= 90) return { point: 8, band: "EE1", label: "Exceeding Expectations" };
  if (mark >= 75) return { point: 7, band: "EE2", label: "Exceeding Expectations" };
  if (mark >= 58) return { point: 6, band: "ME1", label: "Meeting Expectations" };
  if (mark >= 41) return { point: 5, band: "ME2", label: "Meeting Expectations" };
  if (mark >= 31) return { point: 4, band: "AE1", label: "Approaching Expectations" };
  if (mark >= 21) return { point: 3, band: "AE2", label: "Approaching Expectations" };
  if (mark >= 11) return { point: 2, band: "BE1", label: "Below Expectations" };

  return { point: 1, band: "BE2", label: "Below Expectations" };
}

function formatMark(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return Number(value).toFixed(1);
}

function formatGender(value: string | null) {
  if (!value) return "—";

  const normalized = value.toUpperCase();

  if (normalized === "MALE" || normalized === "BOY") return "B";
  if (normalized === "FEMALE" || normalized === "GIRL") return "G";

  return value;
}

function gradeLabel(grade: string) {
  return grade.replace("_", " ");
}

// --------------------------------------------------
// API HELPER
// --------------------------------------------------

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    throw new Error(
      `Expected JSON from ${url}. Check that the API route exists and that authentication is valid.`,
    );
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Unable to load report data.");
  }

  return data as T;
}

// --------------------------------------------------
// SCHOOL AGGREGATION
// --------------------------------------------------

function buildSchoolReports(
  candidates: Candidate[],
  columns: SubjectColumn[],
): SchoolReport[] {
  const groups = new Map<string, Candidate[]>();

  for (const candidate of candidates) {
    const current = groups.get(candidate.school.id) ?? [];
    current.push(candidate);
    groups.set(candidate.school.id, current);
  }

  const reports: SchoolReport[] = [];

  for (const [schoolId, learners] of groups) {
    const first = learners[0];

    const subjectAverages: Record<string, number | null> = {};

    let totalMarks = 0;
    let recordedMarks = 0;

    for (const subject of columns) {
      const values = learners
        .map((learner) => learner.scores[subject.code])
        .filter(
          (value): value is number =>
            value !== null &&
            value !== undefined &&
            Number.isFinite(value),
        );

      if (values.length === 0) {
        subjectAverages[subject.code] = null;
        continue;
      }

      const average =
        values.reduce((sum, value) => sum + value, 0) / values.length;

      subjectAverages[subject.code] = average;

      totalMarks += values.reduce((sum, value) => sum + value, 0);
      recordedMarks += values.length;
    }

    const overallAverage =
      recordedMarks > 0 ? totalMarks / recordedMarks : 0;

    const totalAverage =
      learners.length > 0
        ? learners.reduce((sum, learner) => sum + learner.total, 0) /
          learners.length
        : 0;

    reports.push({
      id: schoolId,
      name: first.school.name,
      category:
        first.school.category ??
        first.category ??
        "—",
      cluster: first.school.cluster?.name ?? "—",
      entry: learners.length,
      subjectAverages,
      totalAverage,
      overallAverage,
      performance: getPerformance(overallAverage) ?? {
        point: 0,
        band: "—",
        label: "—",
      },
      position: 0,
    });
  }

  reports.sort((a, b) => b.overallAverage - a.overallAverage);

  let previousAverage: number | null = null;
  let previousPosition = 0;

  reports.forEach((school, index) => {
    if (previousAverage !== school.overallAverage) {
      previousPosition = index + 1;
      previousAverage = school.overallAverage;
    }

    school.position = previousPosition;
  });

  return reports;
}

// --------------------------------------------------
// SMALL COMPONENTS
// --------------------------------------------------

function PerformanceCell({
  mark,
}: {
  mark: number | null | undefined;
}) {
  const performance = getPerformance(mark);

  return (
    <>
      <td className="mark-cell">{formatMark(mark)}</td>
      <td className="pl-cell">
        {performance?.point ?? "—"}
      </td>
    </>
  );
}

function PerformanceSummary({
  mark,
}: {
  mark: number;
}) {
  const performance = getPerformance(mark);

  return (
    <span className="performance-summary">
      {performance?.band ?? "—"}
    </span>
  );
}

// --------------------------------------------------
// PAGE
// --------------------------------------------------

export default function ReportsPage() {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("ALL");
  const [reportType, setReportType] = useState<"CANDIDATES" | "SCHOOLS">(
    "CANDIDATES",
  );

  const [results, setResults] = useState<GradeResults[]>([]);
  const [assessmentInfo, setAssessmentInfo] = useState<Assessment | null>(
    null,
  );

  const [loadingAssessments, setLoadingAssessments] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [error, setError] = useState("");

  // ------------------------------------------------
  // LOAD ASSESSMENTS
  // ------------------------------------------------

  useEffect(() => {
    async function loadAssessments() {
      try {
        setLoadingAssessments(true);
        setError("");

        const response = await fetchJSON<AssessmentResponse>(
          "/api/assessments",
        );

        setAssessments(response.data);

        if (response.data.length > 0) {
          setSelectedAssessment(response.data[0].id);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load assessments.",
        );
      } finally {
        setLoadingAssessments(false);
      }
    }

    loadAssessments();
  }, []);

  // ------------------------------------------------
  // LOAD RESULTS
  // ------------------------------------------------

  useEffect(() => {
    if (!selectedAssessment) return;

    async function loadResults() {
      try {
        setLoadingResults(true);
        setError("");

        const response = await fetchJSON<ResultsResponse>(
          `/api/results?assessmentId=${encodeURIComponent(selectedAssessment)}`,
        );

        if (!response.success) {
          throw new Error(response.message || "Unable to load results.");
        }

        setResults(response.data);
        setAssessmentInfo(response.assessment);
      } catch (err) {
        setResults([]);
        setAssessmentInfo(null);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load results.",
        );
      } finally {
        setLoadingResults(false);
      }
    }

    loadResults();
  }, [selectedAssessment]);

  // ------------------------------------------------
  // FILTER GRADES
  // ------------------------------------------------

  const visibleGrades = useMemo(() => {
    if (selectedGrade === "ALL") {
      return results.filter((item) => item.rows.length > 0);
    }

    return results.filter((item) => item.grade === selectedGrade);
  }, [results, selectedGrade]);

  // ------------------------------------------------
  // PRINT
  // ------------------------------------------------

  function printReport() {
    window.print();
  }

  // ------------------------------------------------
  // RENDER
  // ------------------------------------------------

  return (
    <main className="reports-page">
      <section className="page-toolbar no-print">
        <div>
          <h1>Examination Reports</h1>
          <p>Candidate and school performance reports</p>
        </div>

        <button
          type="button"
          className="print-button"
          onClick={printReport}
          disabled={visibleGrades.length === 0 || loadingResults}
        >
          Print report
        </button>
      </section>

      <section className="filters no-print">
        <label>
          Assessment
          <select
            value={selectedAssessment}
            onChange={(event) => setSelectedAssessment(event.target.value)}
            disabled={loadingAssessments}
          >
            <option value="">
              {loadingAssessments ? "Loading..." : "Select assessment"}
            </option>

            {assessments.map((assessment) => (
              <option key={assessment.id} value={assessment.id}>
                {assessment.name} ({assessment.year})
              </option>
            ))}
          </select>
        </label>

        <label>
          Grade
          <select
            value={selectedGrade}
            onChange={(event) => setSelectedGrade(event.target.value)}
          >
            <option value="ALL">All grades</option>

            {grades.map((grade) => (
              <option key={grade} value={grade}>
                {gradeLabel(grade)}
              </option>
            ))}
          </select>
        </label>

        <label>
          Report type
          <select
            value={reportType}
            onChange={(event) =>
              setReportType(event.target.value as "CANDIDATES" | "SCHOOLS")
            }
          >
            <option value="CANDIDATES">Candidate performance</option>
            <option value="SCHOOLS">School performance</option>
          </select>
        </label>
      </section>

      {error && (
        <div className="error-message no-print">
          {error}
        </div>
      )}

      {loadingResults && (
        <p className="loading-message no-print">
          Loading examination results...
        </p>
      )}

      {!loadingResults && !error && visibleGrades.length === 0 && (
        <div className="empty-message no-print">
          No results found for this assessment and grade.
        </div>
      )}

      {!loadingResults && visibleGrades.length > 0 && (
        <section className="report-document">
          <header className="report-heading">
            <h2>EXAMINATION COUNCIL</h2>

            <h3>
              {assessmentInfo?.name ?? "Assessment"}{" "}
              {assessmentInfo?.year ?? ""}
            </h3>

            <p>
              {selectedGrade === "ALL"
                ? "ALL GRADES"
                : gradeLabel(selectedGrade)}
            </p>

            <div className="report-meta">
              <span>
                Candidates: {visibleGrades.reduce(
                  (sum, item) => sum + item.count,
                  0,
                )}
              </span>

              <span>
                Grades: {visibleGrades.length}
              </span>
            </div>
          </header>

          <div className="report-section-title">
            {reportType === "CANDIDATES"
              ? "CANDIDATE PERFORMANCE"
              : "OVERALL SCHOOL PERFORMANCE"}
          </div>

          {visibleGrades.map((gradeData) => {
            const schoolReports = buildSchoolReports(
              gradeData.rows,
              gradeData.columns,
            );

            const gradeTotal = gradeData.rows.reduce(
              (sum, candidate) => sum + candidate.total,
              0,
            );

            const averageTotal =
              gradeData.rows.length > 0
                ? gradeTotal / gradeData.rows.length
                : 0;

            const overallAverage =
              gradeData.rows.length > 0
                ? gradeData.rows.reduce(
                    (sum, candidate) => {
                      const recorded = Object.values(candidate.scores).filter(
                        (mark) =>
                          mark !== null &&
                          mark !== undefined &&
                          Number.isFinite(mark),
                      );

                      const average =
                        recorded.length > 0
                          ? recorded.reduce((a, b) => a + b, 0) /
                            recorded.length
                          : 0;

                      return sum + average;
                    },
                    0,
                  ) / gradeData.rows.length
                : 0;

            const bandCounts = {
              EE: 0,
              ME: 0,
              AE: 0,
              BE: 0,
            };

            for (const candidate of gradeData.rows) {
              const recorded = Object.values(candidate.scores).filter(
                (mark) =>
                  mark !== null &&
                  mark !== undefined &&
                  Number.isFinite(mark),
              );

              if (recorded.length === 0) continue;

              const average =
                recorded.reduce((sum, mark) => sum + mark, 0) /
                recorded.length;

              const performance = getPerformance(average);

              if (performance?.band.startsWith("EE")) bandCounts.EE++;
              else if (performance?.band.startsWith("ME")) bandCounts.ME++;
              else if (performance?.band.startsWith("AE")) bandCounts.AE++;
              else if (performance?.band.startsWith("BE")) bandCounts.BE++;
            }

            return (
              <section className="grade-report" key={gradeData.grade}>
                <h3 className="grade-heading">
                  {gradeLabel(gradeData.grade)} PERFORMANCE
                </h3>

                <div className="grade-summary">
                  <div>
                    <span>ENTRY</span>
                    <strong>{gradeData.count}</strong>
                  </div>

                  <div>
                    <span>AVERAGE TOTAL</span>
                    <strong>{formatMark(averageTotal)}</strong>
                  </div>

                  <div>
                    <span>AVERAGE MARK</span>
                    <strong>{formatMark(overallAverage)}%</strong>
                  </div>

                  <div>
                    <span>OVERALL PL</span>
                    <strong>
                      {getPerformance(overallAverage)?.band ?? "—"}
                    </strong>
                  </div>
                </div>

                {reportType === "CANDIDATES" ? (
                  <div className="table-wrapper">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th rowSpan={2}>S/N</th>
                          <th rowSpan={2}>CAT</th>
                          <th rowSpan={2}>LEARNER ID</th>
                          <th rowSpan={2}>STUDENT NAME</th>
                          <th rowSpan={2}>B/G</th>
                          <th rowSpan={2}>SCHOOL</th>
                          <th rowSpan={2}>CLUSTER</th>

                          {gradeData.columns.map((subject) => (
                            <th key={subject.code} colSpan={2}>
                              {subject.name}
                            </th>
                          ))}

                          <th colSpan={2}>TOTAL</th>
                          <th rowSpan={2}>POSITION</th>
                        </tr>

                        <tr>
                          {gradeData.columns.flatMap((subject) => [
                            <th className="sub-heading" key={`${subject.code}-mark`}>
                              MARK
                            </th>,
                            <th className="sub-heading" key={`${subject.code}-pl`}>
                              PL
                            </th>,
                          ])}

                          <th className="sub-heading">MARK</th>
                          <th className="sub-heading">PL</th>
                        </tr>
                      </thead>

                      <tbody>
                        {gradeData.rows.map((candidate, index) => {
                          const recorded = Object.values(candidate.scores).filter(
                            (mark) =>
                              mark !== null &&
                              mark !== undefined &&
                              Number.isFinite(mark),
                          );

                          const average =
                            recorded.length > 0
                              ? recorded.reduce((sum, mark) => sum + mark, 0) /
                                recorded.length
                              : 0;

                          return (
                            <tr key={candidate.id}>
                              <td>{index + 1}</td>
                              <td>
                                {candidate.school.category ??
                                  candidate.category ??
                                  "—"}
                              </td>
                              <td>{candidate.learnerId}</td>
                              <td className="name-cell">{candidate.name}</td>
                              <td>{formatGender(candidate.gender)}</td>
                              <td>{candidate.school.name}</td>
                              <td>
                                {candidate.school.cluster?.name ?? "—"}
                              </td>

                              {gradeData.columns.map((subject) => (
                                <PerformanceCell
                                  key={subject.code}
                                  mark={candidate.scores[subject.code]}
                                />
                              ))}

                              <td className="total-cell">
                                {formatMark(candidate.total)}
                              </td>

                              <td className="pl-cell">
                                {getPerformance(average)?.band ?? "—"}
                              </td>

                              <td className="position-cell">
                                {candidate.position}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="table-wrapper">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th rowSpan={2}>S/N</th>
                          <th rowSpan={2}>CAT</th>
                          <th rowSpan={2}>SCHOOL</th>
                          <th rowSpan={2}>CLUSTER</th>
                          <th rowSpan={2}>ENTRY</th>

                          {gradeData.columns.map((subject) => (
                            <th key={subject.code} colSpan={2}>
                              {subject.name}
                            </th>
                          ))}

                          <th colSpan={2}>TOTAL</th>
                          <th rowSpan={2}>POS</th>
                        </tr>

                        <tr>
                          {gradeData.columns.flatMap((subject) => [
                            <th className="sub-heading" key={`${subject.code}-mark`}>
                              MARK
                            </th>,
                            <th className="sub-heading" key={`${subject.code}-pl`}>
                              PL
                            </th>,
                          ])}

                          <th className="sub-heading">AVERAGE</th>
                          <th className="sub-heading">PL</th>
                        </tr>
                      </thead>

                      <tbody>
                        {schoolReports.map((school, index) => (
                          <tr key={school.id}>
                            <td>{index + 1}</td>
                            <td>{school.category}</td>
                            <td className="name-cell">{school.name}</td>
                            <td>{school.cluster}</td>
                            <td>{school.entry}</td>

                            {gradeData.columns.map((subject) => (
                              <PerformanceCell
                                key={subject.code}
                                mark={school.subjectAverages[subject.code]}
                              />
                            ))}

                            <td className="total-cell">
                              {formatMark(school.totalAverage)}
                            </td>

                            <td className="pl-cell">
                              {school.performance.band}
                            </td>

                            <td className="position-cell">
                              {school.position}
                            </td>
                          </tr>
                        ))}
                      </tbody>

                      <tfoot>
                        <tr>
                          <th colSpan={4}>TOTAL / AVERAGE</th>
                          <th>{gradeData.count}</th>

                          {gradeData.columns.map((subject) => {
                            const average =
                              schoolReports.length > 0
                                ? schoolReports.reduce(
                                    (sum, school) =>
                                      sum +
                                      (school.subjectAverages[subject.code] ??
                                        0),
                                    0,
                                  ) / schoolReports.length
                                : 0;

                            return (
                              <PerformanceCell
                                key={subject.code}
                                mark={average}
                              />
                            );
                          })}

                          <th>{formatMark(averageTotal)}</th>
                          <th>
                            {getPerformance(overallAverage)?.band ?? "—"}
                          </th>
                          <th>—</th>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                <section className="rubric-summary">
                  <h4>PERFORMANCE LEVEL SUMMARY</h4>

                  <table className="summary-table">
                    <thead>
                      <tr>
                        <th>GRADE</th>
                        <th>ENTRY</th>
                        <th>EE</th>
                        <th>ME</th>
                        <th>AE</th>
                        <th>BE</th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr>
                        <td>{gradeLabel(gradeData.grade)}</td>
                        <td>{gradeData.count}</td>
                        <td>{bandCounts.EE}</td>
                        <td>{bandCounts.ME}</td>
                        <td>{bandCounts.AE}</td>
                        <td>{bandCounts.BE}</td>
                      </tr>
                    </tbody>
                  </table>

                  <p className="pass-summary">
                    Percentage meeting or exceeding expectations:{" "}
                    {gradeData.count > 0
                      ? (
                          ((bandCounts.EE + bandCounts.ME) /
                            gradeData.count) *
                          100
                        ).toFixed(1)
                      : "0.0"}
                    %
                  </p>
                </section>
              </section>
            );
          })}

          <footer className="report-footer">
            Examination Performance Report
          </footer>
        </section>
      )}

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        .reports-page {
          min-height: 100vh;
          padding: clamp(14px, 2.5vw, 32px);
          color: #172033;
          background: #f3f6fa;
          font-family: Arial, Helvetica, sans-serif;
        }

        .page-toolbar,
        .filters,
        .error-message,
        .empty-message,
        .loading-message,
        .report-document {
          width: min(100%, 1680px);
          margin-right: auto;
          margin-left: auto;
        }

        .page-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 20px;
        }

        .page-toolbar h1 {
          margin: 0;
          color: #14213a;
          font-size: clamp(22px, 2.2vw, 29px);
          font-weight: 800;
          letter-spacing: -0.035em;
        }

        .page-toolbar p {
          margin: 6px 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .print-button {
          display: inline-flex;
          min-height: 42px;
          align-items: center;
          justify-content: center;
          padding: 0 18px;
          border: 1px solid #174ea6;
          border-radius: 7px;
          background: #174ea6;
          color: #fff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: background .18s ease, transform .18s ease;
        }

        .print-button:hover:not(:disabled) {
          background: #123d82;
          transform: translateY(-1px);
        }

        .print-button:disabled {
          cursor: not-allowed;
          opacity: .45;
        }

        .filters {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 22px;
          padding: 17px;
          border: 1px solid #dce4ed;
          border-radius: 9px;
          background: #fff;
          box-shadow: 0 3px 12px rgb(15 23 42 / 4%);
        }

        .filters label {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 7px;
          color: #334155;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .055em;
          text-transform: uppercase;
        }

        .filters select {
          width: 100%;
          height: 42px;
          padding: 0 12px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: #fff;
          color: #172033;
          font: inherit;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: normal;
          text-transform: none;
        }

        .filters select:focus-visible,
        .print-button:focus-visible {
          outline: 3px solid rgb(37 99 235 / 22%);
          outline-offset: 2px;
        }

        .error-message,
        .empty-message {
          margin-bottom: 18px;
          padding: 14px 16px;
          border: 1px solid #dce4ed;
          border-radius: 7px;
          background: #fff;
          color: #475569;
          font-size: 13px;
        }

        .error-message {
          border-color: #fecaca;
          background: #fff7f7;
          color: #b42318;
        }

        .loading-message {
          padding: 14px 0;
          color: #64748b;
          font-size: 13px;
        }

        /* Report canvas: clean on screen, formal when printed. */
        .report-document {
          overflow: hidden;
          padding: clamp(16px, 2.5vw, 34px);
          border: 1px solid #d7e0ea;
          border-radius: 9px;
          background: #fff;
          box-shadow: 0 8px 28px rgb(15 23 42 / 5%);
        }

        .report-heading {
          margin-bottom: 16px;
          padding: 4px 0 14px;
          border-bottom: 2px solid #1f2937;
          text-align: center;
        }

        .report-heading::before {
          display: none;
        }

        .report-heading h2 {
          margin: 0;
          color: #111827;
          font-size: clamp(15px, 1.5vw, 19px);
          font-weight: 850;
          letter-spacing: .025em;
          line-height: 1.35;
        }

        .report-heading h3 {
          margin: 5px 0 0;
          color: #1f2937;
          font-size: 14px;
          font-weight: 700;
        }

        .report-heading p {
          margin: 7px 0 0;
          color: #c62828;
          font-size: 13px;
          font-weight: 850;
          letter-spacing: .045em;
        }

        .report-meta {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 8px 20px;
          margin-top: 10px;
          color: #475569;
          font-size: 11px;
          font-weight: 700;
        }

        .report-meta span {
          padding: 0;
          border: 0;
          background: transparent;
        }

        .report-section-title {
          margin: 12px 0 20px;
          color: #c62828;
          font-size: clamp(13px, 1.3vw, 16px);
          font-weight: 900;
          letter-spacing: .04em;
          text-align: center;
        }

        .grade-report {
          margin: 0 0 36px;
          page-break-inside: auto;
        }

        .grade-heading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin: 22px 0 13px;
          color: #174ea6;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: .055em;
          text-align: center;
          text-transform: uppercase;
        }

        .grade-heading::before,
        .grade-heading::after {
          width: min(10vw, 100px);
          height: 1px;
          background: #aebdce;
          content: "";
        }

        .grade-summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 9px;
          margin-bottom: 14px;
        }

        .grade-summary div {
          display: flex;
          min-width: 0;
          min-height: 58px;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 10px 12px;
          border: 1px solid #cbd5e1;
          border-radius: 5px;
          background: #f8fafc;
        }

        .grade-summary span {
          color: #475569;
          font-size: 9px;
          font-weight: 850;
          letter-spacing: .045em;
        }

        .grade-summary strong {
          color: #172554;
          font-size: 16px;
          font-weight: 900;
          font-variant-numeric: tabular-nums;
        }

        .table-wrapper {
          width: 100%;
          overflow: auto;
          border: 1px solid #111827;
          background: #fff;
          overscroll-behavior-x: contain;
          scrollbar-width: thin;
          scrollbar-color: #94a3b8 #edf2f7;
        }

        .table-wrapper::after {
          display: block;
          height: 0;
          content: "";
        }

        .report-table,
        .summary-table {
          width: 100%;
          border-collapse: collapse;
          color: #111827;
          font-size: 10px;
          font-variant-numeric: tabular-nums;
        }

        .report-table {
          min-width: 1080px;
        }

        .report-table th,
        .report-table td,
        .summary-table th,
        .summary-table td {
          padding: 6px 5px;
          border: 1px solid #1f2937;
          text-align: center;
          vertical-align: middle;
          white-space: nowrap;
        }

        .report-table thead th,
        .summary-table thead th {
          background: #fff;
          color: #17609c;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .025em;
          text-transform: uppercase;
        }

        .report-table thead tr:first-child th {
          padding-top: 9px;
          padding-bottom: 8px;
          border-bottom: 1px solid #1f2937;
          font-size: 9px;
        }

        .report-table .sub-heading {
          background: #f8fafc;
          color: #17609c;
          font-size: 8px;
          font-weight: 900;
        }

        .report-table tbody tr:nth-child(odd) {
          background: #fff;
        }

        .report-table tbody tr:nth-child(even) {
          background: #dff4fb;
        }

        .report-table tbody tr:hover {
          background: #ccebf6;
        }

        .report-table tbody td {
          font-size: 9px;
        }

        .report-table .name-cell {
          min-width: 145px;
          color: #111827;
          font-weight: 800;
          text-align: left;
        }

        .report-table .mark-cell {
          min-width: 40px;
        }

        .report-table .pl-cell,
        .report-table .position-cell {
          color: #c62828;
          font-weight: 900;
        }

        .report-table .total-cell {
          background: #eef6ff;
          color: #b91c1c;
          font-weight: 900;
        }

        .report-table tfoot th {
          background: #eef3f8;
          color: #174ea6;
          font-weight: 900;
        }

        .rubric-summary {
          width: min(100%, 720px);
          margin: 24px auto 0;
          padding: 15px;
          border: 1px solid #cbd5e1;
          background: #fff;
        }

        .rubric-summary h4 {
          margin: 0 0 11px;
          color: #174ea6;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .05em;
          text-align: center;
        }

        .summary-table {
          border: 1px solid #1f2937;
        }

        .summary-table th,
        .summary-table td {
          padding: 8px 10px;
        }

        .summary-table tbody td {
          background: #fff;
          font-weight: 800;
        }

        .pass-summary {
          margin: 11px 0 0;
          color: #c62828;
          font-size: 10px;
          font-weight: 900;
          text-align: right;
        }

        .report-footer {
          margin-top: 26px;
          padding-top: 12px;
          border-top: 1px solid #94a3b8;
          color: #64748b;
          font-size: 10px;
          font-style: italic;
          font-weight: 700;
          text-align: center;
        }

        .performance-summary {
          color: #c62828;
          font-weight: 900;
        }

        @media (max-width: 900px) {
          .reports-page {
            padding: 18px 12px;
          }

          .filters {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .filters label:last-child {
            grid-column: 1 / -1;
          }

          .report-document {
            padding: 18px 12px;
          }

          .grade-summary {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 560px) {
          .page-toolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .print-button {
            width: 100%;
          }

          .filters {
            grid-template-columns: 1fr;
            padding: 13px;
          }

          .filters label:last-child {
            grid-column: auto;
          }

          .report-document {
            padding: 15px 9px;
          }

          .report-meta {
            gap: 6px 13px;
          }

          .grade-summary {
            gap: 7px;
          }

          .grade-summary div {
            min-height: 62px;
            align-items: flex-start;
            flex-direction: column;
            justify-content: center;
            gap: 4px;
            padding: 8px;
          }

          .grade-summary span {
            font-size: 8px;
          }

          .grade-summary strong {
            font-size: 15px;
          }

          .rubric-summary {
            padding: 10px 7px;
          }

          .summary-table th,
          .summary-table td {
            padding: 7px 5px;
            font-size: 9px;
          }
        }

        @media print {
          @page {
            size: A3 landscape;
            margin: 9mm;
          }

          html,
          body {
            margin: 0 !important;
            background: #fff !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }

          .no-print {
            display: none !important;
          }

          .reports-page {
            min-height: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          .report-document {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          .report-heading {
            margin-bottom: 10px;
            padding: 0 0 9px;
            border-bottom: 2px solid #111827;
          }

          .report-heading h2 {
            font-size: 15px;
          }

          .report-heading h3 {
            font-size: 11px;
          }

          .report-heading p {
            font-size: 10px;
          }

          .report-section-title {
            margin: 8px 0 12px;
            font-size: 12px;
          }

          .grade-report {
            margin-bottom: 0;
            page-break-after: always;
            break-after: page;
          }

          .grade-report:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          .grade-heading {
            margin: 10px 0 8px;
            font-size: 10px;
          }

          .grade-summary {
            gap: 5px;
            margin-bottom: 8px;
          }

          .grade-summary div {
            min-height: 0;
            padding: 5px 7px;
            border-radius: 0;
          }

          .grade-summary span {
            font-size: 7px;
          }

          .grade-summary strong {
            font-size: 10px;
          }

          .table-wrapper {
            overflow: visible !important;
            border: 0;
          }

          .report-table {
            width: 100% !important;
            min-width: 0 !important;
            table-layout: auto;
            font-size: 7px;
          }

          .report-table th,
          .report-table td {
            padding: 3px 2px;
            font-size: 6.8px;
            white-space: normal;
          }

          .report-table thead {
            display: table-header-group;
          }

          .report-table tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .report-table tbody tr:hover {
            background: inherit;
          }

          .rubric-summary {
            width: min(100%, 620px);
            margin-top: 12px;
            padding: 9px;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .rubric-summary h4 {
            margin-bottom: 6px;
            font-size: 8px;
          }

          .summary-table th,
          .summary-table td {
            padding: 4px 7px;
            font-size: 7px;
          }

          .pass-summary {
            margin-top: 6px;
            font-size: 7px;
          }

          .report-footer {
            margin-top: 12px;
            padding-top: 7px;
            font-size: 8px;
          }
        }
      `}</style>
    </main>
  );
}
