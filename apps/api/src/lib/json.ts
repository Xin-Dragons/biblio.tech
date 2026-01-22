/**
 * Recursively converts BigInt values to strings for JSON serialization
 */
export function stringifyBigInts<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === "bigint") {
    return obj.toString() as T
  }

  if (Array.isArray(obj)) {
    return obj.map(stringifyBigInts) as T
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = stringifyBigInts(value)
    }
    return result as T
  }

  return obj
}
