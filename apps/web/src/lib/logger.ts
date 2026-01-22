/**
 * Simple logger utility that respects environment
 * Debug logs are suppressed in production builds
 */

type LogLevel = "debug" | "info" | "warn" | "error"

interface Logger {
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
}

const isDevMode = import.meta.env.DEV

function log(level: LogLevel, ...args: unknown[]): void {
  if (level === "debug" && !isDevMode) {
    return
  }

  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`

  switch (level) {
    case "debug":
      console.debug(prefix, ...args)
      break
    case "info":
      console.info(prefix, ...args)
      break
    case "warn":
      console.warn(prefix, ...args)
      break
    case "error":
      console.error(prefix, ...args)
      break
  }
}

export const logger: Logger = {
  debug: (...args: unknown[]) => log("debug", ...args),
  info: (...args: unknown[]) => log("info", ...args),
  warn: (...args: unknown[]) => log("warn", ...args),
  error: (...args: unknown[]) => log("error", ...args),
}
