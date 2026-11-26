export function getSafeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) {
    return "/";
  }
  try {
    const base = "https://original-wave.invalid";
    const target = new URL(value, base);
    if (target.origin !== base) return "/";
    return target.pathname + target.search + target.hash;
  } catch {
    return "/";
  }
}
