import { apiRequest } from "./client";
import { isPermissionKey, type PermissionKey } from "../permissions";

export type ShellUser = {
  id?: string | number;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  school?: { id?: string | number; name?: string | null } | null;
  permissions: PermissionKey[];
};

type ProfileResponse = {
  data: Omit<ShellUser, "permissions"> & { permissions?: unknown };
};

export async function getCurrentProfile() {
  const response = await apiRequest<ProfileResponse>("/api/profile");
  const rawPermissions = response.data.permissions;
  const grantedPermissions = Array.isArray(rawPermissions)
    ? rawPermissions.filter(
        (permission): permission is PermissionKey =>
          typeof permission === "string" && isPermissionKey(permission),
      )
    : [];

  return { ...response.data, permissions: grantedPermissions };
}
