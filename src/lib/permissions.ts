export const permissions = {
  assessmentCreate: "assessment:create",
  schoolRead: "school:read",
  studentRead: "student:read",
  marksRead: "marks:read",
  resultsRead: "results:read",
} as const;

export type PermissionKey = (typeof permissions)[keyof typeof permissions];

const knownPermissionKeys = new Set<string>(Object.values(permissions));

export function isPermissionKey(value: string): value is PermissionKey {
  return knownPermissionKeys.has(value);
}

export function hasPermission(
  granted: readonly string[] | undefined,
  required: PermissionKey,
) {
  return granted?.includes(required) ?? false;
}
