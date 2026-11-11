
export type PerformanceLevel =
  | "PL1"
  | "PL2"
  | "PL3"
  | "PL4"
  | "PL5"
  | "PL6"
  | "PL7"
  | "PL8";

export type PerformanceCategory =
  | "EE"
  | "ME"
  | "AE"
  | "BE";

export type GradeNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export type RubricBand = {
  level: PerformanceLevel;
  min: number;
  max: number;
};

export type RubricConfig = {
  bands: RubricBand[];

  categoryByLevel: Partial<
    Record<PerformanceLevel, PerformanceCategory>
  >;
};

// Eight-level CBE/KJSEA reporting scale.
// PL1 = BE2 (lowest); PL8 = EE1 (highest).
export const JUNIOR_SCHOOL_RUBRIC: RubricConfig = {
  bands: [
    { level: "PL1", min: 0, max: 10 },
    { level: "PL2", min: 11, max: 20 },
    { level: "PL3", min: 21, max: 30 },
    { level: "PL4", min: 31, max: 40 },
    { level: "PL5", min: 41, max: 57 },
    { level: "PL6", min: 58, max: 74 },
    { level: "PL7", min: 75, max: 89 },
    { level: "PL8", min: 90, max: 100 },
  ],

  categoryByLevel: {
    PL1: "BE",
    PL2: "BE",
    PL3: "AE",
    PL4: "AE",
    PL5: "ME",
    PL6: "ME",
    PL7: "EE",
    PL8: "EE",
  },
};

// Grades 1–6 use the four broad CBE categories.
// Percentage boundaries are intentionally not configured here.
// They must come from the approved assessment rubric used by
// your examination council.
export const LOWER_PRIMARY_RUBRIC: RubricConfig = {
  bands: [],
  categoryByLevel: {},
};

// Select a rubric according to the candidate's grade.
export function getRubricForGrade(
  grade: GradeNumber
): RubricConfig {
  if (grade >= 7) {
    return JUNIOR_SCHOOL_RUBRIC;
  }

  return LOWER_PRIMARY_RUBRIC;
}

export type PerformanceResult = {
  percentage: number;
  level: PerformanceLevel | null;
  category: PerformanceCategory | null;
  points: number | null;
};

export function validateRubric(
  config: RubricConfig
): string[] {
  const errors: string[] = [];
  const levels = new Set<PerformanceLevel>();

  for (const band of config.bands) {
    if (levels.has(band.level)) {
      errors.push(`Duplicate rubric level: ${band.level}`);
    }

    levels.add(band.level);

    if (
      !Number.isFinite(band.min) ||
      !Number.isFinite(band.max) ||
      band.min < 0 ||
      band.max > 100 ||
      band.min > band.max
    ) {
      errors.push(`Invalid percentage range for ${band.level}`);
    }
  }

  const sorted = [...config.bands].sort(
    (a, b) => a.min - b.min
  );

  for (let index = 1; index < sorted.length; index++) {
    const previous = sorted[index - 1];
    const current = sorted[index];

    if (current.min <= previous.max) {
      errors.push(
        `Overlapping ranges: ${previous.level} and ${current.level}`
      );
    }

    if (current.min > previous.max + 1) {
      errors.push(
        `Gap between ${previous.level} and ${current.level}`
      );
    }
  }

  if (
    config.bands.length > 0 &&
    (sorted[0].min !== 0 ||
      sorted[sorted.length - 1].max !== 100)
  ) {
    errors.push("Rubric must cover percentages from 0 to 100.");
  }

  return errors;
}

function getPoints(level: PerformanceLevel): number {
  return Number(level.replace("PL", ""));
}

export function classifyPerformance(
  percentage: number,
  grade: GradeNumber
): PerformanceResult {
  if (
    !Number.isFinite(percentage) ||
    percentage < 0 ||
    percentage > 100
  ) {
    throw new Error("Percentage must be between 0 and 100.");
  }

  const config = getRubricForGrade(grade);

  const errors = validateRubric(config);

  if (errors.length > 0) {
    throw new Error(
      `Invalid rubric configuration: ${errors.join("; ")}`
    );
  }

  const band = config.bands.find(
    (item) =>
      percentage >= item.min &&
      percentage <= item.max
  );

  if (!band) {
    return {
      percentage,
      level: null,
      category: null,
      points: null,
    };
  }

  return {
    percentage,
    level: band.level,
    category: config.categoryByLevel[band.level] ?? null,
    points: getPoints(band.level),
  };
}
