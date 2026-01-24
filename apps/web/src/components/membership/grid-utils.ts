import type { LayoutSize } from "@/stores/ui"

export const columnCountBySize: Record<LayoutSize, Record<string, number>> = {
  large: { xl: 3, lg: 2, md: 2, sm: 2, xs: 1 },
  medium: { xl: 4, lg: 3, md: 3, sm: 3, xs: 2 },
  small: { xl: 5, lg: 4, md: 4, sm: 3, xs: 2 },
}

export const gapBySize: Record<LayoutSize, number> = {
  large: 16,
  medium: 8,
  small: 4,
}

export const infoHeightBySize: Record<LayoutSize, number> = {
  large: 100,
  medium: 102,
  small: 104,
}

export function getColumnCount(width: number, layoutSize: LayoutSize): number {
  const sizes = columnCountBySize[layoutSize]
  if (width >= 550) return sizes.xl
  if (width >= 500) return sizes.lg
  if (width >= 480) return sizes.md
  if (width >= 460) return sizes.sm
  return sizes.xs
}
