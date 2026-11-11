
import {
  classifyPerformance,
  type PerformanceLevel,
  type PerformanceCategory,
} from "@/lib/results/rubric";

/* -------------------------------------------------------------------------- */
/*                                  TYPES                                     */
/* -------------------------------------------------------------------------- */

export type Gender = "MALE" | "FEMALE" | "UNKNOWN";

export type GradeNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type ResultScore = {
  subjectId: string;
  subjectName: string;
  marks: number;
};

export type ResultCandidate = {
  id: string;
  learnerId: string;
  name: string;
  gender?: string | null;
  grade: string;
  schoolId: string;
  schoolName?: string;
  scores: ResultScore[];
};

export type ExpectedSubject = {
  id: string;
  name: string;
  maxMarks: number;
};

export type CandidateResult = {
  id: string;
  learnerId: string;
  name: string;
  gender: Gender;
  grade: GradeNumber | null;
  schoolId: string;
  schoolName?: string;

  totalMarks: number;
  maximumMarks: number;
  percentage: number | null;

  scoreCount: number;
  expectedScoreCount: number;
  missingScoreCount: number;
  isComplete: boolean;

  performanceLevel: PerformanceLevel | null;
  performanceCategory: PerformanceCategory | null;
  performancePoints: number | null;
};

export type ResultSummary = {
  candidateCount: number;
  completeCandidateCount: number;
  incompleteCandidateCount: number;

  totalMarks: number;
  maximumPossibleMarks: number;
  averageTotalMarks: number;
  averagePercentage: number | null;

  highestPercentage: number | null;
  lowestPercentage: number | null;

  scoreCount: number;
  expectedScoreCount: number;
  missingScoreCount: number;

  completionRate: number;
};

export type SubjectSummary = {
  subjectId: string;
  subjectName: string;

  candidateCount: number;
  scoreCount: number;
  missingScoreCount: number;

  totalMarks: number;
  maximumMarks: number;
  averageMarks: number | null;
  averagePercentage: number | null;

  highestMarks: number | null;
  lowestMarks: number | null;

  passCount: number;
  passRate: number | null;
};

export type GroupSummary = {
  id: string;
  name: string;

  candidateCount: number;
  completeCandidateCount: number;
  incompleteCandidateCount: number;

  totalMarks: number;
  averageTotalMarks: number;
  averagePercentage: number | null;
  completionRate: number;
};

export type GenderSummary = {
  gender: Gender;
  candidateCount: number;
  completeCandidateCount: number;
  incompleteCandidateCount: number;
  averagePercentage: number | null;
  averageTotalMarks: number;
};

export type PerformanceDistribution = {
  grade: GradeNumber;
  candidateCount: number;

  levels: Record<PerformanceLevel, number>;
  categories: Record<PerformanceCategory, number>;

  unclassifiedCount: number;
};

export type CandidateRank = {
  candidateId: string;
  name: string;
  grade: GradeNumber | null;
  totalMarks: number;
  percentage: number | null;
  rank: number;
};

/* -------------------------------------------------------------------------- */
/*                              BASIC HELPERS                                 */
/* -------------------------------------------------------------------------- */

export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function normalizeGender(value?: string | null): Gender {
  if (!value) return "UNKNOWN";

  const gender = value.trim().toLowerCase();

  if (["male", "m", "boy", "boys"].includes(gender)) {
    return "MALE";
  }

  if (["female", "f", "girl", "girls"].includes(gender)) {
    return "FEMALE";
  }

  return "UNKNOWN";
}

export function getGradeNumber(
  grade: string | number,
): GradeNumber | null {
  const value =
    typeof grade === "number"
      ? grade
      : Number(grade.replace(/^GRADE_/i, ""));

  if (
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 9
  ) {
    return value as GradeNumber;
  }

  return null;
}

function safePercentage(
  obtained: number,
  maximum: number,
): number | null {
  if (maximum <= 0) return null;

  return round((obtained / maximum) * 100);
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;

  return round(
    values.reduce((sum, value) => sum + value, 0) /
      values.length,
  );
}

function emptyLevels(): Record<PerformanceLevel, number> {
  return {
    PL1: 0,
    PL2: 0,
    PL3: 0,
    PL4: 0,
    PL5: 0,
    PL6: 0,
    PL7: 0,
    PL8: 0,
  };
}

function emptyCategories(): Record<PerformanceCategory, number> {
  return {
    BE: 0,
    AE: 0,
    ME: 0,
    EE: 0,
  };
}

/* -------------------------------------------------------------------------- */
/*                         CANDIDATE CALCULATIONS                             */
/* -------------------------------------------------------------------------- */

/**
 * Calculates one candidate's result using the expected subjects
 * configured for that candidate's grade and assessment.
 *
 * A subject with no recorded score is treated as missing, not zero.
 */
export function calculateCandidateResult(
  candidate: ResultCandidate,
  expectedSubjects: ExpectedSubject[],
): CandidateResult {
  const grade = getGradeNumber(candidate.grade);

  const scoreMap = new Map(
    candidate.scores.map((score) => [
      score.subjectId,
      score.marks,
    ]),
  );

  const applicableSubjects = expectedSubjects;

  let totalMarks = 0;
  let maximumMarks = 0;
  let scoreCount = 0;

  for (const subject of applicableSubjects) {
    maximumMarks += subject.maxMarks;

    const marks = scoreMap.get(subject.id);

    if (marks !== undefined && Number.isFinite(marks)) {
      totalMarks += marks;
      scoreCount++;
    }
  }

  const expectedScoreCount = applicableSubjects.length;
  const missingScoreCount = Math.max(
    0,
    expectedScoreCount - scoreCount,
  );

  const isComplete =
    expectedScoreCount > 0 &&
    missingScoreCount === 0;

  const percentage = isComplete
    ? safePercentage(totalMarks, maximumMarks)
    : null;

  const classification =
    percentage !== null && grade !== null
      ? classifyPerformance(percentage, grade)
      : null;

  return {
    id: candidate.id,
    learnerId: candidate.learnerId,
    name: candidate.name,
    gender: normalizeGender(candidate.gender),
    grade,
    schoolId: candidate.schoolId,
    schoolName: candidate.schoolName,

    totalMarks: round(totalMarks),
    maximumMarks: round(maximumMarks),
    percentage,

    scoreCount,
    expectedScoreCount,
    missingScoreCount,
    isComplete,

    performanceLevel: classification?.level ?? null,
    performanceCategory: classification?.category ?? null,
    performancePoints: classification?.points ?? null,
  };
}

/**
 * Calculates results for all candidates.
 * Expected subjects must be appropriate for the candidate's grade.
 */
export function calculateCandidateResults(
  candidates: ResultCandidate[],
  expectedSubjectsByGrade: Partial<
    Record<GradeNumber, ExpectedSubject[]>
  >,
): CandidateResult[] {
  return candidates.map((candidate) => {
    const grade = getGradeNumber(candidate.grade);
    const expectedSubjects = grade
      ? expectedSubjectsByGrade[grade] ?? []
      : [];

    return calculateCandidateResult(
      candidate,
      expectedSubjects,
    );
  });
}

/* -------------------------------------------------------------------------- */
/*                              RESULT SUMMARY                                */
/* -------------------------------------------------------------------------- */

export function calculateResultSummary(
  candidates: CandidateResult[],
): ResultSummary {
  const complete = candidates.filter(
    (candidate) => candidate.isComplete,
  );

  const totalMarks = candidates.reduce(
    (sum, candidate) => sum + candidate.totalMarks,
    0,
  );

  const maximumPossibleMarks = candidates.reduce(
    (sum, candidate) => sum + candidate.maximumMarks,
    0,
  );

  const percentages = complete
    .map((candidate) => candidate.percentage)
    .filter((value): value is number => value !== null);

  const scoreCount = candidates.reduce(
    (sum, candidate) => sum + candidate.scoreCount,
    0,
  );

  const expectedScoreCount = candidates.reduce(
    (sum, candidate) => sum + candidate.expectedScoreCount,
    0,
  );

  const missingScoreCount = candidates.reduce(
    (sum, candidate) => sum + candidate.missingScoreCount,
    0,
  );

  return {
    candidateCount: candidates.length,
    completeCandidateCount: complete.length,
    incompleteCandidateCount:
      candidates.length - complete.length,

    totalMarks: round(totalMarks),
    maximumPossibleMarks: round(maximumPossibleMarks),
    averageTotalMarks: average(
      complete.map((candidate) => candidate.totalMarks),
    ) ?? 0,

    averagePercentage: average(percentages),

    highestPercentage:
      percentages.length > 0
        ? Math.max(...percentages)
        : null,

    lowestPercentage:
      percentages.length > 0
        ? Math.min(...percentages)
        : null,

    scoreCount,
    expectedScoreCount,
    missingScoreCount,

    completionRate:
      expectedScoreCount > 0
        ? round((scoreCount / expectedScoreCount) * 100)
        : 0,
  };
}

/* -------------------------------------------------------------------------- */
/*                           SUBJECT SUMMARIES                                */
/* -------------------------------------------------------------------------- */

/**
 * A pass threshold is a report/application setting.
 * It is not assumed to be a universal CBE threshold.
 */
export function calculateSubjectSummaries(
  candidates: ResultCandidate[],
  expectedSubjects: ExpectedSubject[],
  passPercentage?: number,
): SubjectSummary[] {
  return expectedSubjects.map((subject) => {
    const marks: number[] = [];

    for (const candidate of candidates) {
      const score = candidate.scores.find(
        (item) => item.subjectId === subject.id,
      );

      if (
        score &&
        Number.isFinite(score.marks)
      ) {
        marks.push(score.marks);
      }
    }

    const totalMarks = marks.reduce(
      (sum, mark) => sum + mark,
      0,
    );

    const percentages = marks.map((mark) =>
      safePercentage(mark, subject.maxMarks),
    ).filter((value): value is number => value !== null);

    const passCount =
      passPercentage === undefined
        ? 0
        : percentages.filter(
            (percentage) => percentage >= passPercentage,
          ).length;

    return {
      subjectId: subject.id,
      subjectName: subject.name,

      candidateCount: candidates.length,
      scoreCount: marks.length,
      missingScoreCount: Math.max(
        0,
        candidates.length - marks.length,
      ),

      totalMarks: round(totalMarks),
      maximumMarks: round(subject.maxMarks * marks.length),
      averageMarks: average(marks),
      averagePercentage: average(percentages),

      highestMarks:
        marks.length > 0 ? Math.max(...marks) : null,

      lowestMarks:
        marks.length > 0 ? Math.min(...marks) : null,

      passCount,
      passRate:
        passPercentage === undefined || marks.length === 0
          ? null
          : round((passCount / marks.length) * 100),
    };
  });
}

/* -------------------------------------------------------------------------- */
/*                        SCHOOL / CLUSTER SUMMARIES                          */
/* -------------------------------------------------------------------------- */

/**
 * Groups candidate results by school or cluster.
 *
 * Provide a group ID and name for each candidate.
 * Use candidate percentages rather than raw totals when comparing
 * groups with different maximum possible marks.
 */
export function calculateGroupSummaries(
  candidates: CandidateResult[],
  getGroup: (candidate: CandidateResult) => {
    id: string;
    name: string;
  },
): GroupSummary[] {
  const groups = new Map<
    string,
    {
      id: string;
      name: string;
      candidates: CandidateResult[];
    }
  >();

  for (const candidate of candidates) {
    const group = getGroup(candidate);

    if (!groups.has(group.id)) {
      groups.set(group.id, {
        id: group.id,
        name: group.name,
        candidates: [],
      });
    }

    groups.get(group.id)!.candidates.push(candidate);
  }

  return [...groups.values()]
    .map((group) => {
      const complete = group.candidates.filter(
        (candidate) => candidate.isComplete,
      );

      return {
        id: group.id,
        name: group.name,

        candidateCount: group.candidates.length,
        completeCandidateCount: complete.length,
        incompleteCandidateCount:
          group.candidates.length - complete.length,

        totalMarks: round(
          group.candidates.reduce(
            (sum, candidate) => sum + candidate.totalMarks,
            0,
          ),
        ),

        averageTotalMarks:
          average(
            complete.map((candidate) => candidate.totalMarks),
          ) ?? 0,

        averagePercentage: average(
          complete
            .map((candidate) => candidate.percentage)
            .filter((value): value is number => value !== null),
        ),

        completionRate:
          group.candidates.length > 0
            ? round(
                (complete.length / group.candidates.length) *
                  100,
              )
            : 0,
      };
    })
    .sort(
      (a, b) =>
        (b.averagePercentage ?? -1) -
        (a.averagePercentage ?? -1),
    );
}

/* -------------------------------------------------------------------------- */
/*                             GENDER SUMMARY                                 */
/* -------------------------------------------------------------------------- */

export function calculateGenderSummaries(
  candidates: CandidateResult[],
): GenderSummary[] {
  const genders: Gender[] = [
    "MALE",
    "FEMALE",
    "UNKNOWN",
  ];

  return genders.map((gender) => {
    const group = candidates.filter(
      (candidate) => candidate.gender === gender,
    );

    const complete = group.filter(
      (candidate) => candidate.isComplete,
    );

    return {
      gender,
      candidateCount: group.length,
      completeCandidateCount: complete.length,
      incompleteCandidateCount:
        group.length - complete.length,

      averagePercentage: average(
        complete
          .map((candidate) => candidate.percentage)
          .filter((value): value is number => value !== null),
      ),

      averageTotalMarks:
        average(
          complete.map((candidate) => candidate.totalMarks),
        ) ?? 0,
    };
  });
}

/* -------------------------------------------------------------------------- */
/*                       PERFORMANCE DISTRIBUTION                            */
/* -------------------------------------------------------------------------- */

/**
 * Classifies only candidates with complete scores and a valid percentage.
 * The grade-specific rubric decides whether a percentage can be classified.
 */
export function calculatePerformanceDistribution(
  candidates: CandidateResult[],
): PerformanceDistribution[] {
  const grades: GradeNumber[] = [
    1, 2, 3, 4, 5, 6, 7, 8, 9,
  ];

  return grades.map((grade) => {
    const group = candidates.filter(
      (candidate) => candidate.grade === grade,
    );

    const levels = emptyLevels();
    const categories = emptyCategories();

    let unclassifiedCount = 0;

    for (const candidate of group) {
      if (
        !candidate.isComplete ||
        candidate.percentage === null
      ) {
        unclassifiedCount++;
        continue;
      }

      if (candidate.performanceLevel) {
        levels[candidate.performanceLevel]++;
      } else {
        unclassifiedCount++;
      }

      if (candidate.performanceCategory) {
        categories[candidate.performanceCategory]++;
      }
    }

    return {
      grade,
      candidateCount: group.length,
      levels,
      categories,
      unclassifiedCount,
    };
  }).filter((item) => item.candidateCount > 0);
}

/* -------------------------------------------------------------------------- */
/*                                  RANKING                                   */
/* -------------------------------------------------------------------------- */

/**
 * Competition ranking: 1, 1, 3.
 *
 * Only complete candidates with a valid percentage are ranked.
 * Candidates are ranked separately per grade.
 */
export function calculateRanks(
  candidates: CandidateResult[],
): CandidateRank[] {
  const eligible = candidates.filter(
    (candidate) =>
      candidate.isComplete &&
      candidate.percentage !== null,
  );

  const grades = new Map<GradeNumber, CandidateResult[]>();

  for (const candidate of eligible) {
    if (candidate.grade === null) continue;

    if (!grades.has(candidate.grade)) {
      grades.set(candidate.grade, []);
    }

    grades.get(candidate.grade)!.push(candidate);
  }

  const ranked: CandidateRank[] = [];

  for (const [grade, group] of grades) {
    group.sort(
      (a, b) =>
        (b.percentage ?? 0) - (a.percentage ?? 0),
    );

    let previousPercentage: number | null = null;
    let currentRank = 0;

    group.forEach((candidate, index) => {
      const percentage = candidate.percentage!;

      if (percentage !== previousPercentage) {
        currentRank = index + 1;
        previousPercentage = percentage;
      }

      ranked.push({
        candidateId: candidate.id,
        name: candidate.name,
        grade,
        totalMarks: candidate.totalMarks,
        percentage,
        rank: currentRank,
      });
    });
  }

  return ranked.sort(
    (a, b) =>
      (a.grade ?? 0) - (b.grade ?? 0) ||
      a.rank - b.rank ||
      a.name.localeCompare(b.name),
  );
}

/**
 * Returns rankings for a single grade.
 */
export function calculateGradeRanks(
  candidates: CandidateResult[],
  grade: GradeNumber,
): CandidateRank[] {
  return calculateRanks(
    candidates.filter(
      (candidate) => candidate.grade === grade,
    ),
  );
}

/* -------------------------------------------------------------------------- */
/*                          CATEGORY PASS SUMMARY                            */
/* -------------------------------------------------------------------------- */

/**
 * Calculates the percentage of candidates in each performance category.
 * The denominator is the number of classified candidates.
 */
export function calculateCategorySummary(
  candidates: CandidateResult[],
) {
  const categories = emptyCategories();

  let classifiedCount = 0;

  for (const candidate of candidates) {
    if (
      !candidate.isComplete ||
      !candidate.performanceCategory
    ) {
      continue;
    }

    categories[candidate.performanceCategory]++;
    classifiedCount++;
  }

  return {
    classifiedCount,
    unclassifiedCount: candidates.length - classifiedCount,
    categories,

    percentages: {
      EE:
        classifiedCount > 0
          ? round((categories.EE / classifiedCount) * 100)
          : 0,

      ME:
        classifiedCount > 0
          ? round((categories.ME / classifiedCount) * 100)
          : 0,

      AE:
        classifiedCount > 0
          ? round((categories.AE / classifiedCount) * 100)
          : 0,

      BE:
        classifiedCount > 0
          ? round((categories.BE / classifiedCount) * 100)
          : 0,
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                         PERCENTAGE PASS SUMMARY                            */
/* -------------------------------------------------------------------------- */

/**
 * Calculates a pass rate using a caller-supplied percentage threshold.
 * This is configurable report logic, not a universal CBE rule.
 */
export function calculatePassSummary(
  candidates: CandidateResult[],
  passPercentage: number,
) {
  const complete = candidates.filter(
    (candidate) =>
      candidate.isComplete &&
      candidate.percentage !== null,
  );

  const passCount = complete.filter(
    (candidate) =>
      candidate.percentage! >= passPercentage,
  ).length;

  return {
    candidateCount: candidates.length,
    eligibleCount: complete.length,
    passCount,
    failCount: complete.length - passCount,
    unclassifiedCount: candidates.length - complete.length,

    passRate:
      complete.length > 0
        ? round((passCount / complete.length) * 100)
        : null,
  };
}
