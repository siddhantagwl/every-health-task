// single source of truth for allowed severities
export const ALLOWED_SEVERITIES = ["debug", "info", "warning", "error"] as const;

export type Severity = (typeof ALLOWED_SEVERITIES)[number];

export function isSeverity(value: string): value is Severity {
  return (ALLOWED_SEVERITIES as readonly string[]).includes(value);
}
