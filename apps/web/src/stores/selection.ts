import { atom } from "jotai"

export const selectedMintsAtom = atom<Set<string>>(new Set<string>())

export const isSelectModeAtom = atom(false)

export const toggleSelectModeAtom = atom(null, (_get, set) => {
  set(isSelectModeAtom, (prev) => {
    if (prev) {
      set(selectedMintsAtom, new Set())
    }
    return !prev
  })
})

export const toggleSelectedAtom = atom(null, (get, set, mint: string) => {
  const selected = get(selectedMintsAtom)
  const newSelected = new Set(selected)
  if (newSelected.has(mint)) {
    newSelected.delete(mint)
  } else {
    newSelected.add(mint)
  }
  set(selectedMintsAtom, newSelected)
})

export const selectAllAtom = atom(null, (_get, set, mints: string[]) => {
  set(selectedMintsAtom, new Set(mints))
})

export const clearSelectionAtom = atom(null, (_get, set) => {
  set(selectedMintsAtom, new Set())
})

export const isSelectedAtom = atom((get) => {
  const selected = get(selectedMintsAtom)
  return (mint: string) => selected.has(mint)
})
