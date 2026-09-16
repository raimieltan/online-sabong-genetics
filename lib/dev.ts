export function isDevModeEnabled(authUserId: string | null): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (!authUserId) return false;
  const allowlist = (process.env.DEV_MODE_ALLOWLIST ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return allowlist.includes(authUserId);
}
