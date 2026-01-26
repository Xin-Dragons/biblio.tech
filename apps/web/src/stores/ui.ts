import { atom } from "jotai"
import { atomWithStorage } from "jotai/utils"

export type LayoutSize = "small" | "medium" | "large"
export type LayoutType = "manage" | "collage"
export type SortOption = "name" | "rarity" | "recent" | "collection"

export const layoutSizeAtom = atomWithStorage<LayoutSize>("biblio-layout-size", "medium")
export const layoutTypeAtom = atomWithStorage<LayoutType>("biblio-layout-type", "manage")
export const sortOptionAtom = atomWithStorage<SortOption>("biblio-sort", "collection")
export const searchQueryAtom = atom("")
export const showInfoAtom = atomWithStorage("biblio-show-info", true)
export const sidebarCollapsedAtom = atomWithStorage("biblio-sidebar-collapsed", false)

// Tag filter - set of selected tag IDs (empty = show all, "untagged" = show NFTs with no tags)
export const tagFilterAtom = atom<Set<string>>(new Set<string>())

// Show untagged NFTs filter
export const showUntaggedFilterAtom = atom(false)
