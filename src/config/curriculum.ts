
export const curriculum = {
  GRADE_1: [
    "ENGLISH",
    "KISWAHILI",
    "INDIGENOUS_LANGUAGE",
    "MATHEMATICS",
    "ENVIRONMENTAL_ACTIVITIES",
    "CREATIVE_ARTS",
    "RELIGIOUS_EDUCATION",
  ],

  GRADE_2: [
    "ENGLISH",
    "KISWAHILI",
    "INDIGENOUS_LANGUAGE",
    "MATHEMATICS",
    "ENVIRONMENTAL_ACTIVITIES",
    "CREATIVE_ARTS",
    "RELIGIOUS_EDUCATION",
  ],

  GRADE_3: [
    "ENGLISH",
    "KISWAHILI",
    "INDIGENOUS_LANGUAGE",
    "MATHEMATICS",
    "ENVIRONMENTAL_ACTIVITIES",
    "CREATIVE_ARTS",
    "RELIGIOUS_EDUCATION",
  ],

  GRADE_4: [
    "ENGLISH",
    "KISWAHILI",
    "MATHEMATICS",
    "SCIENCE_TECHNOLOGY",
    "SOCIAL_STUDIES",
    "AGRICULTURE_NUTRITION",
    "CREATIVE_ARTS",
    "RELIGIOUS_EDUCATION",
  ],

  GRADE_5: [
    "ENGLISH",
    "KISWAHILI",
    "MATHEMATICS",
    "SCIENCE_TECHNOLOGY",
    "SOCIAL_STUDIES",
    "AGRICULTURE_NUTRITION",
    "CREATIVE_ARTS",
    "RELIGIOUS_EDUCATION",
  ],

  GRADE_6: [
    "ENGLISH",
    "KISWAHILI",
    "MATHEMATICS",
    "SCIENCE_TECHNOLOGY",
    "SOCIAL_STUDIES",
    "AGRICULTURE_NUTRITION",
    "CREATIVE_ARTS",
    "RELIGIOUS_EDUCATION",
  ],

  GRADE_7: [
    "ENGLISH",
    "KISWAHILI",
    "MATHEMATICS",
    "INTEGRATED_SCIENCE",
    "SOCIAL_STUDIES",
    "PRE_TECHNICAL_STUDIES",
    "AGRICULTURE_NUTRITION",
    "CREATIVE_ARTS_SPORTS",
    "RELIGIOUS_EDUCATION",
  ],

  GRADE_8: [
    "ENGLISH",
    "KISWAHILI",
    "MATHEMATICS",
    "INTEGRATED_SCIENCE",
    "SOCIAL_STUDIES",
    "PRE_TECHNICAL_STUDIES",
    "AGRICULTURE_NUTRITION",
    "CREATIVE_ARTS_SPORTS",
    "RELIGIOUS_EDUCATION",
  ],

  GRADE_9: [
    "ENGLISH",
    "KISWAHILI",
    "MATHEMATICS",
    "INTEGRATED_SCIENCE",
    "SOCIAL_STUDIES",
    "PRE_TECHNICAL_STUDIES",
    "AGRICULTURE_NUTRITION",
    "CREATIVE_ARTS_SPORTS",
    "RELIGIOUS_EDUCATION",
  ],
} as const;

// Derive the Grade union from the curriculum object.
export type Grade = keyof typeof curriculum;

// Explicitly type the supported grades.
export const grades: Grade[] = [
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

// Validate incoming grade values.
export function isGrade(value: string): value is Grade {
  return grades.includes(value as Grade);
}
