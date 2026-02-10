interface GridBreakpoints {
  lg?: number
  md?: number
  sm?: number
  xs?: number
}

interface GridColumns {
  lg: number
  md: number
  sm: number
  xs: number
  default: number
}

const DEFAULT_BREAKPOINTS: GridBreakpoints = {
  lg: 1024,
  md: 768,
  sm: 640,
  xs: 480,
}

const DEFAULT_COLUMNS: GridColumns = {
  lg: 6,
  md: 5,
  sm: 4,
  xs: 3,
  default: 2,
}

const MODAL_BREAKPOINTS: GridBreakpoints = {
  md: 600,
  sm: 450,
}

const MODAL_COLUMNS: GridColumns = {
  lg: 4,
  md: 4,
  sm: 3,
  xs: 2,
  default: 2,
}

export function getGridColumnCount(
  width: number,
  breakpoints: GridBreakpoints = DEFAULT_BREAKPOINTS,
  columns: GridColumns = DEFAULT_COLUMNS
): number {
  if (breakpoints.lg && width >= breakpoints.lg) return columns.lg
  if (breakpoints.md && width >= breakpoints.md) return columns.md
  if (breakpoints.sm && width >= breakpoints.sm) return columns.sm
  if (breakpoints.xs && width >= breakpoints.xs) return columns.xs
  return columns.default
}

export function getBatchGridColumnCount(width: number): number {
  return getGridColumnCount(width, DEFAULT_BREAKPOINTS, DEFAULT_COLUMNS)
}

export function getModalGridColumnCount(width: number): number {
  return getGridColumnCount(width, MODAL_BREAKPOINTS, MODAL_COLUMNS)
}
