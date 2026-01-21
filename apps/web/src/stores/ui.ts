import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

export type LayoutSize = "small" | "medium" | "large"
export type LayoutType = "grid" | "collage"
export type SortOption = "name" | "rarity" | "recent" | "collection" | "custom"

export const layoutSizeAtom = atomWithStorage<LayoutSize>("biblio-layout-size", "medium")
export const layoutTypeAtom = atomWithStorage<LayoutType>("biblio-layout-type", "grid")
export const sortOptionAtom = atomWithStorage<SortOption>("biblio-sort", "collection")
export const searchQueryAtom = atom("")
export const showInfoAtom = atomWithStorage("biblio-show-info", true)
