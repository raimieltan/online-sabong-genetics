export function isDevModeEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}
