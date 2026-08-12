/**
 * The one guard the defensive envelope parsers share (events, assistant,
 * quality): a plain JSON object — not null, not an array. Each service used
 * to carry its own copy.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
